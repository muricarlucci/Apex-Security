# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
"""Offline tests of the existing v2.3.2 contract; no production changes."""
from unittest.mock import MagicMock
import pytest
from google.api_core import exceptions as errors
import services.gemini_client as gc


@pytest.fixture
def transport(monkeypatch):
    monkeypatch.setattr(gc, "_API_KEYS", ["test-key-1", "test-key-2"])
    monkeypatch.setattr(gc, "_current_key_index", 0)
    responses, calls, clients = [], [], []
    def client_factory(**kwargs):
        client = MagicMock()
        client.key = kwargs["client_options"]["api_key"]
        clients.append(client)
        return client
    def model_factory(**kwargs):
        model = MagicMock()
        def generate(prompt, **options):
            calls.append((kwargs["model_name"], model._client.key, options))
            answer = responses.pop(0)
            if isinstance(answer, Exception):
                raise answer
            return MagicMock(text=answer)
        model.generate_content.side_effect = generate
        return model
    monkeypatch.setattr(gc.glm, "GenerativeServiceClient", client_factory)
    monkeypatch.setattr(gc.genai, "GenerativeModel", model_factory)
    yield responses, calls
    assert all(call[2]["request_options"]["retry"] is None for call in calls)
    assert all(call[2]["request_options"]["timeout"] <= 20 for call in calls)
    assert all(client.transport.close.call_count == 1 for client in clients)


def generate():
    return gc.generate_with_fallback(gc.PRIMARY_GEMINI_MODEL, "test instruction", "test prompt")


def test_normal_operation_is_one_request(transport):
    transport[0].append("ok")
    assert generate().text == "ok" and len(transport[1]) == 1


def test_key_specific_failure_preserves_second_key_and_preference(transport):
    transport[0].extend([errors.Unauthenticated("API key invalid"), "ok"])
    assert generate().text == "ok"
    assert [call[1] for call in transport[1]] == ["test-key-1", "test-key-2"]
    assert gc._current_key_index == 1


@pytest.mark.parametrize("error", [errors.InvalidArgument("bad input"),
    errors.ResourceExhausted("temporary shared quota"), errors.ResourceExhausted("daily project quota")])
def test_real_input_or_shared_quota_errors_do_not_rotate(transport, error):
    transport[0].append(error)
    with pytest.raises(RuntimeError):
        generate()
    assert len(transport[1]) == 1


def test_second_503_uses_model_contingency_once(transport):
    transport[0].extend([errors.ServiceUnavailable("unavailable"), errors.ServiceUnavailable("unavailable"), "ok"])
    assert generate().text == "ok"
    assert [call[0] for call in transport[1]] == [gc.PRIMARY_GEMINI_MODEL, gc.PRIMARY_GEMINI_MODEL, gc.FALLBACK_GEMINI_MODEL]
    assert all(call[1] == "test-key-1" for call in transport[1])


def test_model_daily_quota_uses_other_model_without_key_rotation(transport):
    transport[0].extend([errors.ResourceExhausted(f"requests per day model {gc.PRIMARY_GEMINI_MODEL}"), "ok"])
    assert generate().text == "ok"
    assert [call[0] for call in transport[1]] == [gc.PRIMARY_GEMINI_MODEL, gc.FALLBACK_GEMINI_MODEL]


def test_contingency_failure_does_not_loop(transport):
    transport[0].extend([errors.ServiceUnavailable("unavailable")] * 3)
    with pytest.raises(RuntimeError):
        generate()
    assert len(transport[1]) == 3
