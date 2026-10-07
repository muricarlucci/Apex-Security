# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import json
from html.parser import HTMLParser
from urllib.parse import urlsplit

SEVERITIES = {"3": "HIGH", "2": "MEDIUM", "1": "LOW", "0": "INFO"}


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def strip_html(value, limit=16000):
    parser = PlainText()
    parser.feed(str(value or "")[:65536])
    return " ".join(" ".join(parser.parts).split())[:limit]


def normalize_zap(report, target_url, target_kind):
    if not isinstance(report, dict) or not isinstance(report.get("site"), list):
        raise ValueError("Relatorio ZAP invalido: lista site obrigatoria")
    repository = "dast:juice-shop-lab" if target_kind == "lab" else f"dast:{urlsplit(target_url).hostname}"[:255]
    output = []
    for site in report["site"]:
        if not isinstance(site, dict) or not isinstance(site.get("alerts", []), list):
            raise ValueError("Relatorio ZAP contem site ou lista de alertas invalida")
        for alert in site.get("alerts", []):
            if not isinstance(alert, dict):
                raise ValueError("Relatorio ZAP contem alerta invalido")
            instances = alert.get("instances") or []
            if not isinstance(instances, list) or any(not isinstance(item, dict) for item in instances):
                raise ValueError("Relatorio ZAP contem instancias invalidas")
            severity = SEVERITIES.get(str(alert.get("riskcode", "0")), "INFO")
            examples = [str(item.get("uri", ""))[:2048] for item in instances[:5] if item.get("uri")]
            description = strip_html(alert.get("desc"))
            description += f"\nInstancias: {len(instances)}. Exemplos: {'; '.join(examples)}. Confianca: {strip_html(alert.get('confidence') or alert.get('riskdesc'), 100)}"
            raw = {**alert, "instances": instances[:20]}
            output.append({
                "source_tool": "zap", "scan_type": "DAST", "repository": repository,
                "file_path": str(instances[0].get("uri", ""))[:2048] or None if instances else None,
                "line_number": None, "severity": severity, "severity_adjusted": severity,
                "title": strip_html(alert.get("alert") or alert.get("name") or "Alerta ZAP", 500),
                "description": description[:20000], "cve_id": None,
                "cwe_id": str(alert.get("cweid", ""))[:50] or None,
                "solution": strip_html(alert.get("solution")), "target_url": target_url,
                "raw_output": json.dumps(raw, ensure_ascii=True),
            })
    return output
