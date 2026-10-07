# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import ipaddress
import re
import socket
from urllib.parse import urlsplit, urlunsplit


def validate_target_url(value):
    if not isinstance(value, str) or not value or len(value) > 2048:
        raise ValueError("URL obrigatoria, com no maximo 2048 caracteres")
    # The workflow uses the same alphabet; no spaces, shell metacharacters,
    # fragments, backslashes, userinfo or percent-encoded host confusion.
    if not re.fullmatch(r"https?://[A-Za-z0-9\[\]:._~/%?&=+!,@-]+", value):
        raise ValueError("URL invalida; use http/https sem espacos ou fragmentos")
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Host ou porta invalida") from exc
    if parsed.scheme not in {"http", "https"} or not host or parsed.username is not None or parsed.password is not None:
        raise ValueError("URL deve ter host publico e nao pode conter credenciais")
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal")) or "%" in host:
        raise ValueError("Alvos locais ou internos nao sao permitidos")
    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None
        if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", host):
            raise ValueError("Hostname invalido")
    if literal is not None and (not literal.is_global or literal.is_multicast):
        raise ValueError("Endereco IP deve ser publico e global")
    try:
        addresses = socket.getaddrinfo(host, port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except OSError as exc:
        raise ValueError("Nao foi possivel resolver o DNS do alvo") from exc
    if not addresses:
        raise ValueError("DNS do alvo nao retornou enderecos")
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0].split("%")[0])
        mapped = getattr(ip, "ipv4_mapped", None)
        if not ip.is_global or ip.is_multicast or (mapped is not None and not mapped.is_global):
            raise ValueError("DNS do alvo aponta para endereco nao publico")
    netloc = f"[{host}]" if ":" in host else host
    if port is not None:
        netloc += f":{port}"
    return urlunsplit((parsed.scheme, netloc, parsed.path or "/", parsed.query, ""))


def validate_mode(mode, target_kind, target_url, config):
    if mode not in {"baseline", "full"} or target_kind not in {"lab", "custom"}:
        raise ValueError("Modo ou tipo de alvo invalido")
    if mode == "full" and (not config.active_enabled or (
        target_kind != "lab" and urlsplit(target_url).hostname not in config.training_hosts
    )):
        raise ValueError("Modo ativo permitido apenas no laboratorio e em hosts de treinamento habilitados")
