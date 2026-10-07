# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
"""Runner validation and Docker command checks without subprocess/network I/O."""
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("dast_job", ROOT / "pipeline/dast_job.py")
job = importlib.util.module_from_spec(spec)
spec.loader.exec_module(job)


@pytest.fixture
def environment(monkeypatch):
    for key, value in {"SCAN_ID": "17", "NONCE": "a" * 64, "TARGET_KIND": "lab", "SCAN_MODE": "baseline",
                       "APEX_API_URL": "https://example.org", "APEX_DAST_SECRET": "offline-secret"}.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setattr(job, "validate_target_url", lambda value: value.rstrip("/") + "/")
    monkeypatch.setenv("DAST_ENABLE_ACTIVE", "true")


@pytest.mark.parametrize("key,value", [("SCAN_ID", "17; echo bad"), ("NONCE", "short"), ("TARGET_KIND", "other"),
    ("SCAN_MODE", "scan; echo bad"), ("APEX_DAST_SECRET", ""), ("APEX_API_URL", "http://example.org")])
def test_bad_inputs(environment, monkeypatch, key, value):
    monkeypatch.setenv(key, value)
    with pytest.raises(ValueError):
        job.inputs()


@pytest.mark.parametrize("mode,script", [("baseline", "zap-baseline.py"), ("full", "zap-full-scan.py")])
def test_scanner_arguments_are_fixed_and_not_shell_interpolated(environment, monkeypatch, tmp_path, mode, script):
    monkeypatch.setenv("SCAN_MODE", mode)
    monkeypatch.chdir(tmp_path)
    calls = []
    def run(arguments, **kwargs):
        calls.append((arguments, kwargs))
        (tmp_path / "zap-wrk/zap-report.json").write_text(json.dumps({"site": []}))
        return SimpleNamespace(returncode=0)
    monkeypatch.setattr(job.subprocess, "run", run)
    job.main("scan")
    arguments, kwargs = calls[0]
    assert "ghcr.io/zaproxy/zaproxy:stable" in arguments and script in arguments
    assert arguments[arguments.index("-t") + 1] == "http://localhost:3000"
    assert arguments[arguments.index("--network") + 1] == "host" and "-j" in arguments and "-I" in arguments
    assert not kwargs.get("shell") and kwargs["timeout"] == 1200


def test_scan_without_report_is_not_reported_as_success(environment, monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(job.subprocess, "run", lambda *a, **kw: SimpleNamespace(returncode=3))
    with pytest.raises(RuntimeError, match="nenhum resultado"):
        job.main("scan")


def test_workflow_has_no_secret_input_or_direct_run_expression():
    text = (ROOT / ".github/workflows/apex-dast.yml").read_text()
    assert "${{ secrets.APEX_DAST_SECRET }}" in text
    assert "cancel-in-progress: false" in text and "group: apex-dast" in text
    assert all("${{" not in line for line in text.splitlines() if "run:" in line)
    assert "callback_secret:" not in text and "token:" not in text
