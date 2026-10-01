"""User scoped cache of validated results and cross-worker duplicate protection."""
import asyncio
import hashlib
import inspect
from importlib import import_module
import json
import time
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from functools import wraps
from threading import Event

from fastapi import HTTPException
from sqlalchemy import select, func, insert, update

from database import engine
from models import GeminiOperationCache
from services.gemini_client import operation_context, REQUEST_BUDGET_SECONDS
from services.model_config import get_model_name

_saved_inputs_match = ContextVar("gemini_saved_inputs_match", default=True)


def reuse_saved_result():
    return _saved_inputs_match.get()


def alert_inputs(values):
    from models import Alert
    alert = values["db"].query(Alert).filter(
        Alert.id == values["alert_id"], Alert.user_id == values["current_user"].id
    ).first()
    if not alert:
        raise HTTPException(404, "Alerta nao encontrado")
    return {column.name: getattr(alert, column.name) for column in Alert.__table__.columns}


def _digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=True, default=str).encode()).hexdigest()


def _prompt_fingerprint(operation):
    module, name = {
        "radar": ("services.radar", "RADAR_SYSTEM_PROMPT"),
        "remediation": ("services.remediator", "SYSTEM_PROMPT"),
        "intent": ("services.intent_checker", "INTENT_SYSTEM_PROMPT"),
        "risk": ("services.risk_analyzer", "RISK_SYSTEM_PROMPT"),
        "sla": ("services.risk_analyzer", "SLA_SYSTEM_PROMPT"),
    }[operation]
    return _digest(getattr(import_module(module), name))


def gemini_operation(operation, inputs, ttl_seconds=3600, resource=None):
    """Cache endpoint results after parsing/validation and database persistence."""
    def decorate(function):
        signature = inspect.signature(function)

        @wraps(function)
        def wrapped(*args, **kwargs):
            values = signature.bind(*args, **kwargs).arguments
            user_id = values["current_user"].id
            fingerprint = _digest({"inputs": inputs(values), "model": get_model_name(),
                                   "prompt": _prompt_fingerprint(operation), "revision": "2.3.1"})
            identity = resource(values) if resource else fingerprint
            cache_key = _digest([user_id, operation, identity])
            lock_id = int.from_bytes(bytes.fromhex(cache_key)[:8], "big", signed=True)
            table = GeminiOperationCache.__table__
            now = datetime.now(timezone.utc)
            context = operation_context.get() or {"cancelled": Event(), "deadline": time.monotonic() + REQUEST_BUDGET_SECONDS}
            token = operation_context.set({**context, "operation": operation})
            saved_token = None
            try:
                # Separate transaction: commits in the route's Session cannot
                # release this lock; disconnect/rollback automatically releases it.
                with engine.begin() as connection:
                    if not connection.scalar(select(func.pg_try_advisory_xact_lock(lock_id))):
                        raise HTTPException(409, "Esta analise ja esta em andamento nesta conta. Aguarde a conclusao.", headers={"Retry-After": "2"})
                    row = connection.execute(select(table).where(table.c.cache_key == cache_key, table.c.user_id == user_id)).mappings().first()
                    matches = row is not None and row["input_fingerprint"] == fingerprint
                    if matches and (row["expires_at"] is None or row["expires_at"] > now):
                        return json.loads(row["result_json"])
                    saved_token = _saved_inputs_match.set(row is None or matches)
                    result = function(*args, **kwargs)
                    # Intent returns informative errors, which must not be cached.
                    if operation == "intent" and str(result.get("explanation", "")).startswith("Nao foi possivel analisar:"):
                        return result
                    record = {
                        "user_id": user_id, "operation": operation,
                        "input_fingerprint": fingerprint,
                        "result_json": json.dumps(result, ensure_ascii=True, default=str),
                        "generated_at": now,
                        "expires_at": now + timedelta(seconds=ttl_seconds) if ttl_seconds else None,
                    }
                    if row:
                        connection.execute(update(table).where(table.c.cache_key == cache_key).values(**record))
                    else:
                        connection.execute(insert(table).values(cache_key=cache_key, **record))
                    return result
            finally:
                if saved_token is not None:
                    _saved_inputs_match.reset(saved_token)
                operation_context.reset(token)
        return wrapped
    return decorate


class GeminiRequestLifecycle:
    """Stop new attempts on browser disconnect; RPCs already have 20s deadlines."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        applies = scope["type"] == "http" and (path in ("/api/radar", "/api/intent-check") or any(
            path.startswith(prefix) for prefix in ("/api/remediate/", "/api/risk-assessment/", "/api/sla-assessment/")
        )) and scope.get("method") in ("POST", "GET")
        if not applies:
            return await self.app(scope, receive, send)
        cancelled = Event()
        token = operation_context.set({"cancelled": cancelled, "deadline": time.monotonic() + REQUEST_BUDGET_SECONDS})
        messages = []
        watcher = None
        try:
            # Finish reading JSON before watching receive; do not steal the body.
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    cancelled.set()
                    return
                messages.append(message)
                if not message.get("more_body", False):
                    break

            async def watch_disconnect():
                while True:
                    if (await receive())["type"] == "http.disconnect":
                        cancelled.set()
                        return

            watcher = asyncio.create_task(watch_disconnect())

            async def buffered_receive():
                if messages:
                    return messages.pop(0)
                await watcher
                return {"type": "http.disconnect"}

            async def private_send(message):
                if message["type"] == "http.response.start":
                    headers = [(key, value) for key, value in message.get("headers", []) if key.lower() != b"cache-control"]
                    message = {**message, "headers": headers + [(b"cache-control", b"no-store")]}
                if message["type"] == "http.response.body" and not message.get("more_body", False):
                    cancelled.set()
                await send(message)

            await self.app(scope, buffered_receive, private_send)
        finally:
            cancelled.set()
            if watcher:
                watcher.cancel()
                await asyncio.gather(watcher, return_exceptions=True)
            operation_context.reset(token)
