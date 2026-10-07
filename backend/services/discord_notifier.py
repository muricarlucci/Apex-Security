# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import requests

# Notificacao best-effort: uma falha aqui NUNCA pode quebrar o salvamento do alerta.


def send_discord_alert(webhook_url: str, alert_title: str, severity: str, repository: str) -> bool:
    if not webhook_url:
        return False

    severity_colors = {
        "CRITICAL": 0xC0392B,
        "HIGH": 0xD35400,
        "MEDIUM": 0xC9A84C,
        "LOW": 0x1A6B3C,
        "INFO": 0x2C4A6B,
    }

    payload = {
        "embeds": [{
            "title": "Novo Alerta de Seguranca — Apex Security",
            "description": f"**{alert_title}**",
            "color": severity_colors.get(severity, 0x8A7A5A),
            "fields": [
                {"name": "Severidade", "value": severity or "-", "inline": True},
                {"name": "Repositorio", "value": repository or "-", "inline": True},
            ],
            "footer": {"text": "Apex Security — Plataforma ASPM"}
        }]
    }

    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        return response.status_code in (200, 204)
    except requests.RequestException:
        return False
