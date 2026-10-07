# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import os
import sys
import types
from unittest.mock import MagicMock

# Unit tests do not exercise the Google transport. Stub it BEFORE collection:
# Windows App Control blocks the local grpc DLL; no production code is changed.
# This also makes accidental real Gemini generation fail immediately offline.
os.environ["GEMINI_API_KEY"] = "offline-unit-test-key"
os.environ["GEMINI_API_KEY_2"] = "offline-unit-test-key-2"


def forbidden_generation(*args, **kwargs):
    raise AssertionError("Real Gemini generation is forbidden in unit tests")


genai_stub = types.ModuleType("google.generativeai")
genai_stub.GenerativeModel = forbidden_generation
genai_stub.configure = forbidden_generation
glm_stub = types.ModuleType("google.ai.generativelanguage")
glm_stub.GenerativeServiceClient = lambda *args, **kwargs: MagicMock()
sys.modules["google.generativeai"] = genai_stub
sys.modules["google.ai.generativelanguage"] = glm_stub

# Os testes importam "services.*", que vive em backend/ (estrutura definida na R1,
# com tests/ na raiz do projeto). Inserir backend/ no sys.path resolve o import
# sem alterar a estrutura de pastas.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
