# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import pytest
from unittest.mock import patch, MagicMock
import services.gemini_client as gc


def _fake_model(behaviours):
    """
    Fabrica um GenerativeModel falso: cada chamada consecutiva a generate_content
    consome o proximo item de `behaviours` (Exception -> levanta; str -> devolve).
    """
    calls = {"n": 0}

    def factory(*args, **kwargs):
        model = MagicMock()

        def generate_content(_prompt):
            item = behaviours[calls["n"]]
            calls["n"] += 1
            if isinstance(item, Exception):
                raise item
            resp = MagicMock()
            resp.text = item
            return resp

        model.generate_content.side_effect = generate_content
        return model

    return factory, calls


class TestFallbackEntreChaves:
    """
    O free tier do Gemini tem cota diaria por chave. Quando a chave atual estoura,
    a proxima precisa assumir automaticamente — sem quebrar a requisicao do usuario.
    """

    def test_erro_de_cota_troca_para_proxima_chave(self, monkeypatch):
        monkeypatch.setattr(gc, "_API_KEYS", ["chave-1", "chave-2"])
        monkeypatch.setattr(gc, "_current_key_index", 0)
        factory, calls = _fake_model([Exception("429 Quota exceeded"), "sucesso na segunda"])

        with patch.object(gc.genai, "GenerativeModel", side_effect=factory), \
             patch.object(gc.genai, "configure"):
            resp = gc.generate_with_fallback("modelo", "instrucao", "prompt")

        assert resp.text == "sucesso na segunda"
        assert calls["n"] == 2  # tentou duas vezes

    def test_erro_que_nao_e_de_cota_propaga_imediatamente(self, monkeypatch):
        monkeypatch.setattr(gc, "_API_KEYS", ["chave-1", "chave-2"])
        monkeypatch.setattr(gc, "_current_key_index", 0)
        factory, calls = _fake_model([Exception("400 Invalid argument"), "nao deveria chegar aqui"])

        with patch.object(gc.genai, "GenerativeModel", side_effect=factory), \
             patch.object(gc.genai, "configure"):
            with pytest.raises(Exception, match="Invalid argument"):
                gc.generate_with_fallback("modelo", "instrucao", "prompt")

        assert calls["n"] == 1  # nao tentou a segunda chave

    def test_todas_as_chaves_esgotadas_levanta_runtime_error(self, monkeypatch):
        monkeypatch.setattr(gc, "_API_KEYS", ["chave-1", "chave-2"])
        monkeypatch.setattr(gc, "_current_key_index", 0)
        factory, calls = _fake_model([Exception("429 quota"), Exception("429 quota")])

        with patch.object(gc.genai, "GenerativeModel", side_effect=factory), \
             patch.object(gc.genai, "configure"):
            with pytest.raises(RuntimeError, match="atingiram o limite"):
                gc.generate_with_fallback("modelo", "instrucao", "prompt")

        assert calls["n"] == 2

    def test_chave_que_funcionou_vira_a_preferida(self, monkeypatch):
        monkeypatch.setattr(gc, "_API_KEYS", ["chave-1", "chave-2"])
        monkeypatch.setattr(gc, "_current_key_index", 0)
        factory, _ = _fake_model([Exception("429 quota"), "ok"])

        with patch.object(gc.genai, "GenerativeModel", side_effect=factory), \
             patch.object(gc.genai, "configure"):
            gc.generate_with_fallback("modelo", "instrucao", "prompt")

        assert gc._current_key_index == 1  # passou a preferir a chave que funcionou
