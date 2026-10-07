# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import importlib
import pytest
from services.model_config import DEFAULT_GEMINI_MODEL, get_model_name


@pytest.mark.parametrize('configured', [None, '', '   ', 'gemini-3.8-flash'])
def test_default_model_and_empty_configuration(monkeypatch, configured):
    if configured is None:
        monkeypatch.delenv('GEMINI_MODEL', raising=False)
    else:
        monkeypatch.setenv('GEMINI_MODEL', configured)
    assert DEFAULT_GEMINI_MODEL == 'gemini-3.8-flash'
    assert get_model_name() == DEFAULT_GEMINI_MODEL


def test_explicit_environment_override_is_preserved(monkeypatch):
    monkeypatch.setenv('GEMINI_MODEL', ' custom-model ')
    assert get_model_name() == 'custom-model'


@pytest.mark.parametrize('service', ['remediator', 'intent_checker', 'risk_analyzer', 'radar'])
def test_all_ai_services_use_the_same_configured_model(monkeypatch, service):
    # No SDK calls: verify configuration at the same import boundary as startup.
    monkeypatch.setenv('GEMINI_MODEL', 'gemini-3.8-flash')
    module = importlib.import_module(f'services.{service}')
    original = module.GEMINI_MODEL
    try:
        importlib.reload(module)
        assert module.GEMINI_MODEL == DEFAULT_GEMINI_MODEL
        monkeypatch.setenv('GEMINI_MODEL', 'custom-model')
        importlib.reload(module)
        assert module.GEMINI_MODEL == 'custom-model'
    finally:
        module.GEMINI_MODEL = original
