# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Envio via API HTTPS do Resend, nao por SMTP.
# Motivo: hospedagens gratuitas (Render incluso) bloqueiam conexoes SMTP de saida
# como protecao anti-spam — a conexao na porta 587 simplesmente nunca se estabelece,
# mesmo com credenciais corretas. O Resend usa HTTPS comum e funciona nesse ambiente.

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
CONTACT_EMAIL_TO = os.getenv("CONTACT_EMAIL_TO", "apexsecurityofficial@gmail.com")
RESEND_FROM = os.getenv("RESEND_FROM_ADDRESS", "Apex Security <onboarding@resend.dev>")


def send_contact_email(sender_name: str, sender_email: str, subject: str, message: str) -> bool:
    if not RESEND_API_KEY:
        raise EnvironmentError("RESEND_API_KEY nao configurada nas variaveis de ambiente")

    html_body = f"""
    <div style="font-family: sans-serif; padding: 16px;">
      <h2 style="color: #C9A84C;">Nova mensagem de contato — Apex Security</h2>
      <p><strong>Nome:</strong> {sender_name}</p>
      <p><strong>Email:</strong> {sender_email}</p>
      <p><strong>Assunto:</strong> {subject}</p>
      <hr>
      <p style="white-space: pre-wrap;">{message}</p>
    </div>
    """

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": RESEND_FROM,
            "to": [CONTACT_EMAIL_TO],
            "reply_to": sender_email,
            "subject": f"[Apex Security - Contato] {subject}",
            "html": html_body,
        },
        timeout=15,
    )

    if response.status_code not in (200, 201):
        raise RuntimeError(f"Resend retornou erro {response.status_code}: {response.text}")

    return True
