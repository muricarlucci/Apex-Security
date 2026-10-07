# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import logging
import os
import time
from contextvars import ContextVar
from threading import Event, Lock

import google.generativeai as genai
from google.ai import generativelanguage as glm
from google.api_core import exceptions as google_errors
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("uvicorn.error")
operation_context = ContextVar("gemini_operation", default=None)
REQUEST_BUDGET_SECONDS = 65  # Two primary RPCs plus one contingency RPC.
RPC_TIMEOUT_SECONDS = 20
PRIMARY_GEMINI_MODEL = "gemini-3.8-flash"
FALLBACK_GEMINI_MODEL = "gemini-3.5-flash-lite"


def _load_api_keys() -> list:
    keys = []
    primary = (os.getenv("GEMINI_API_KEY") or "").strip()
    if primary:
        keys.append(primary)
    index = 2
    while True:
        key = (os.getenv(f"GEMINI_API_KEY_{index}") or "").strip()
        if not key:
            break
        if key not in keys:
            keys.append(key)
        index += 1
    if not keys:
        raise EnvironmentError("Nenhuma GEMINI_API_KEY configurada")
    return keys


_API_KEYS = _load_api_keys()
_current_key_index = 0
_key_lock = Lock()


def available_keys() -> int:
    return len(_API_KEYS)


def _error_details(error):
    # Used only for classification, never logged (may include sensitive input).
    return f"{error} {getattr(error, 'details', '')} {getattr(error, 'errors', '')}".lower()


def _daily_quota(error) -> bool:
    return any(marker in _error_details(error) for marker in (
        "perday", "per_day", "per day", "daily", "requests/day", "rpd",
    ))


def _daily_model_quota(error) -> bool:
    details = _error_details(error)
    return (isinstance(error, google_errors.ResourceExhausted) and _daily_quota(error)
            and any(marker in details for marker in (
                PRIMARY_GEMINI_MODEL, "permodel", "per_model", "per model",
            )))


def _key_specific(error) -> bool:
    details = _error_details(error)
    if isinstance(error, google_errors.Unauthenticated):
        return True
    if isinstance(error, (google_errors.InvalidArgument, google_errors.Unauthenticated,
                          google_errors.PermissionDenied)):
        return any(marker in details for marker in (
            "api key", "api_key", "apikey", "key expired", "key invalid",
            "service_disabled", "has not been used in project",
            "permission denied for project",
        ))
    if isinstance(error, google_errors.ResourceExhausted):
        # Unknown/project scoped 429 cannot safely rotate keys.
        return not _daily_quota(error) and any(marker in details for marker in (
            "perapikey", "per_api_key", "per api key", "key-specific",
        ))
    return False


def _remaining(context):
    if context["cancelled"].is_set() or time.monotonic() >= context["deadline"]:
        raise RuntimeError("Operacao Gemini encerrada ou prazo excedido; nenhuma nova tentativa enviada")
    return context["deadline"] - time.monotonic()


def generate_with_fallback(model_name: str, system_instruction: str, prompt: str, max_retries: int = None):
    """Up to two primary RPCs, then one contingency RPC for eligible errors."""
    global _current_key_index
    context = operation_context.get() or {
        "operation": "generation", "cancelled": Event(),
        "deadline": time.monotonic() + REQUEST_BUDGET_SECONDS,
    }
    with _key_lock:
        key_index = _current_key_index
    limit = 2 if max_retries is None else min(2, max(1, max_retries))
    active_model = model_name
    fallback_used = False
    clients = []
    try:
        for attempt in range(1, limit + 2):
            timeout = min(RPC_TIMEOUT_SECONDS, _remaining(context))
            client = glm.GenerativeServiceClient(client_options={"api_key": _API_KEYS[key_index]})
            clients.append(client)
            model = genai.GenerativeModel(model_name=active_model, system_instruction=system_instruction)
            # SDK 0.5.4's explicit transport slot avoids the global default client.
            # Verified against the pinned dependency; preserve response.text.
            model._client = client
            timeout = min(timeout, _remaining(context))
            started = time.monotonic()
            try:
                response = model.generate_content(prompt, request_options={"retry": None, "timeout": timeout})
            except Exception as error:
                status = getattr(error, "code", None)
                status = int(status) if isinstance(status, int) else type(error).__name__
                logger.info("gemini operation=%s model=%s attempt=%s status=%s duration_ms=%s",
                            context["operation"], active_model, attempt, status,
                            round((time.monotonic() - started) * 1000))
                if not fallback_used and attempt < limit and isinstance(error, google_errors.ServiceUnavailable):
                    _remaining(context)
                    if context["cancelled"].wait(0.5):
                        _remaining(context)
                    continue
                if (not fallback_used and model_name.removeprefix("models/") == PRIMARY_GEMINI_MODEL
                        and (isinstance(error, google_errors.ServiceUnavailable) or _daily_model_quota(error))):
                    _remaining(context)
                    active_model = FALLBACK_GEMINI_MODEL
                    fallback_used = True
                    continue
                if not fallback_used and attempt < limit and len(_API_KEYS) > 1 and _key_specific(error):
                    _remaining(context)
                    key_index = (key_index + 1) % len(_API_KEYS)
                    continue
                if isinstance(error, google_errors.ResourceExhausted):
                    kind = "Cota diaria do projeto/modelo esgotada" if _daily_quota(error) else "Limite temporario ou cota compartilhada do projeto/modelo atingida"
                    raise RuntimeError(f"{kind}; nenhuma alternancia inutil entre chaves foi realizada") from error
                raise RuntimeError(f"Gemini indisponivel ({status}); operacao encerrada") from error
            logger.info("gemini operation=%s model=%s attempt=%s status=200 duration_ms=%s",
                        context["operation"], active_model, attempt,
                        round((time.monotonic() - started) * 1000))
            with _key_lock:
                _current_key_index = key_index
            return response
    finally:
        for client in clients:
            client.transport.close()
