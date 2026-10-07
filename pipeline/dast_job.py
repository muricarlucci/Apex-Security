# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
"""GitHub runner commands. No interpolated shell, no secrets in workflow inputs."""
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from services.dast_config import get_dast_config, LAB_URL
from services.dast_validator import validate_target_url, validate_mode


def inputs(validate_target=True):
    scan_id = os.environ.get("SCAN_ID", "")
    nonce = os.environ.get("NONCE", "")
    kind = os.environ.get("TARGET_KIND", "")
    mode = os.environ.get("SCAN_MODE", "")
    if not re.fullmatch(r"[1-9][0-9]{0,17}", scan_id) or not re.fullmatch(r"[a-f0-9]{64}", nonce):
        raise ValueError("ID ou nonce DAST invalido")
    if kind not in {"lab", "custom"} or mode not in {"baseline", "full"}:
        raise ValueError("Tipo de alvo ou modo invalido")
    if not os.environ.get("APEX_DAST_SECRET") or not os.environ.get("APEX_API_URL"):
        raise ValueError("Secrets APEX_DAST_SECRET e APEX_API_URL obrigatorios")
    target = LAB_URL if kind == "lab" else os.environ.get("TARGET_URL_INPUT", "")
    if validate_target:
        target = LAB_URL if kind == "lab" else validate_target_url(target)
        validate_mode(mode, kind, target, get_dast_config())
    # Restrict callback base too; credential-free public HTTPS origin, no paths.
    callback = validate_target_url(os.environ["APEX_API_URL"].rstrip("/"))
    from urllib.parse import urlsplit
    parsed = urlsplit(callback)
    if parsed.scheme != "https" or parsed.path != "/" or parsed.query:
        raise ValueError("APEX_API_URL deve ser uma origem HTTPS publica")
    return scan_id, nonce, kind, mode, target, callback.rstrip("/")


def notify(status, best_effort=False):
    scan_id, nonce, _, mode, _, base = inputs(validate_target=False)
    signature = hmac.new(os.environ["APEX_DAST_SECRET"].encode(), f"{scan_id}:{nonce}".encode(), hashlib.sha256).hexdigest()
    payload = {"status": status, "mode": mode}
    if status == "completed":
        payload["report"] = json.loads(Path("zap-wrk/zap-report.json").read_text())
    if status == "failed":
        payload["error"] = "Falha na execucao DAST; consulte o workflow"
    body = json.dumps(payload).encode()
    if len(body) > 8 * 1024 * 1024:
        raise ValueError("Relatorio excede o limite de 8 MB")
    attempts = 1 if best_effort else 5
    for attempt in range(attempts):
        request = urllib.request.Request(f"{base}/api/dast/scans/{scan_id}/results", data=body,
                                         headers={"Content-Type": "application/json", "X-Apex-Dast-Signature": signature})
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                if 200 <= response.status < 300:
                    print(f"Callback DAST: HTTP {response.status}")
                    return
        except urllib.error.HTTPError as error:
            if error.code < 500 and error.code != 429:
                raise RuntimeError(f"Callback DAST rejeitado: HTTP {error.code}") from None
        except (urllib.error.URLError, TimeoutError):
            pass
        if attempt + 1 < attempts:
            time.sleep(20)
    raise RuntimeError("Callback DAST nao confirmado pela API")


def main(command):
    _, _, kind, mode, target, _ = inputs(validate_target=command not in {"running", "completed", "failed"})
    if command == "validate":
        print("Entradas DAST validadas; segredos e assinatura nao sao registrados")
    elif command in {"running", "completed", "failed"}:
        notify(command, best_effort=command != "completed")
    elif command == "lab" and kind == "lab":
        subprocess.run(["docker", "run", "-d", "--rm", "--name", "juice-shop", "-p", "127.0.0.1:3000:3000", "bkimminich/juice-shop"], check=True, stdout=subprocess.DEVNULL)
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            try:
                with urllib.request.urlopen(LAB_URL, timeout=2) as response:
                    if response.status == 200:
                        print("Laboratorio pronto")
                        return
            except (urllib.error.URLError, TimeoutError):
                pass
            time.sleep(2)
        raise RuntimeError("Laboratorio nao iniciou em ate 3 minutos")
    elif command == "scan":
        directory = Path("zap-wrk").resolve()
        directory.mkdir(exist_ok=True)
        directory.chmod(0o777)
        script = "zap-baseline.py" if mode == "baseline" else "zap-full-scan.py"
        arguments = ["docker", "run", "--rm", "--name", "apex-zap", "--network", "host", "-v", f"{directory}:/zap/wrk/:rw",
                     "ghcr.io/zaproxy/zaproxy:stable", script, "-t", target, "-J", "zap-report.json", "-I", "-j", "-m", "2", "-T", "15", "-s"]
        # Do not print scanner output (URLs/evidence may be sensitive).
        try:
            result = subprocess.run(arguments, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=1200)
        except subprocess.TimeoutExpired:
            raise RuntimeError("ZAP excedeu 20 minutos") from None
        report = directory / "zap-report.json"
        if result.returncode != 0 or not report.is_file() or report.stat().st_size == 0:
            raise RuntimeError(f"ZAP nao concluiu corretamente (codigo {result.returncode}); nenhum resultado foi enviado")
        data = json.loads(report.read_text())
        if not isinstance(data.get("site"), list):
            raise RuntimeError("ZAP nao produziu um relatorio traditional-json valido")
        print("ZAP concluiu; relatorio JSON valido produzido")
    elif command != "lab":
        raise ValueError("Comando DAST invalido")


if __name__ == "__main__":
    try:
        main(sys.argv[1])
    except Exception as error:
        # Only messages created by this script, never raw network/provider errors.
        if isinstance(error, (ValueError, RuntimeError)):
            print(str(error)[:500], file=sys.stderr)
        else:
            print(f"Falha DAST ({type(error).__name__}); consulte configuracao do job", file=sys.stderr)
        sys.exit(1)
