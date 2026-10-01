import json
import uuid
from datetime import datetime, timezone
from typing import Optional


def _object(value, field):
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError(f"Campo {field} deve ser um objeto JSON")
    return value


def _records(value, field):
    if value is None:
        return []
    if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
        raise ValueError(f"Campo {field} deve ser uma lista de objetos JSON")
    return value


def _cve(value):
    # ASU stores one CVE; the complete scanner metadata remains in raw_output.
    if isinstance(value, list):
        if any(not isinstance(item, str) for item in value):
            raise ValueError("Campo cve deve conter texto")
        return value[0] if value else None
    if value is not None and not isinstance(value, str):
        raise ValueError("Campo cve deve conter texto")
    return value


def normalize_severity(raw_severity: str) -> str:
    """Normaliza strings de severidade de diferentes ferramentas para padrão ASU."""
    mapping = {
        # Semgrep
        "error": "HIGH",
        "warning": "MEDIUM",
        "info": "INFO",
        "note": "LOW",
        # Trivy
        "critical": "CRITICAL",
        "high": "HIGH",
        "medium": "MEDIUM",
        "low": "LOW",
        "unknown": "INFO",
    }
    if raw_severity is None:
        return "INFO"
    if not isinstance(raw_severity, str):
        raise ValueError("Campo severity deve conter texto")
    return mapping.get(raw_severity.lower(), "INFO")


def parse_semgrep(raw_json: dict, repository: str) -> list[dict]:
    """
    Converte output bruto do Semgrep para lista de alertas no formato ASU.
    O Semgrep retorna: {"results": [...], "errors": [...]}
    """
    alerts = []
    results = _records(raw_json.get("results", []), "results")

    for result in results:
        extra = _object(result.get("extra"), "extra")
        metadata = _object(extra.get("metadata"), "metadata")
        start = _object(result.get("start"), "start")

        raw_severity = extra.get("severity", "warning")
        normalized = normalize_severity(raw_severity)

        alert = {
            "id": str(uuid.uuid4()),
            "source_tool": "semgrep",
            "repository": repository,
            "file_path": result.get("path"),
            "line_number": start.get("line"),
            "severity": normalized,
            "severity_adjusted": normalized,  # será ajustado pelo Módulo 3
            "title": result.get("check_id", "Vulnerabilidade detectada pelo Semgrep"),
            "description": extra.get("message"),
            "cve_id": _cve(metadata.get("cve")),
            "iac_internet_exposed": None,  # será preenchido pelo Módulo 3
            "raw_output": json.dumps(result),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        alerts.append(alert)

    return alerts


def parse_trivy(raw_json: dict, repository: str) -> list[dict]:
    """
    Converte output bruto do Trivy para lista de alertas no formato ASU.
    O Trivy retorna: {"Results": [{"Vulnerabilities": [...], "Misconfigurations": [...]}]}
    """
    alerts = []
    results = _records(raw_json.get("Results", []), "Results")

    for result in results:
        target = result.get("Target", "unknown")

        # Vulnerabilidades de pacotes
        for vuln in _records(result.get("Vulnerabilities"), "Vulnerabilities"):
            raw_severity = vuln.get("Severity", "UNKNOWN")
            normalized = normalize_severity(raw_severity)
            vulnerability_id = _cve(vuln.get("VulnerabilityID"))

            alert = {
                "id": str(uuid.uuid4()),
                "source_tool": "trivy",
                "repository": repository,
                "file_path": target,
                "line_number": None,
                "severity": normalized,
                "severity_adjusted": normalized,
                "title": vuln.get("VulnerabilityID", "Vulnerabilidade desconhecida"),
                "description": vuln.get("Description") or vuln.get("Title"),
                "cve_id": vulnerability_id if (vulnerability_id or "").startswith("CVE") else None,
                "iac_internet_exposed": None,
                "raw_output": json.dumps(vuln),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            alerts.append(alert)

        # Misconfigurations de IaC
        for misc in _records(result.get("Misconfigurations"), "Misconfigurations"):
            raw_severity = misc.get("Severity", "UNKNOWN")
            normalized = normalize_severity(raw_severity)

            alert = {
                "id": str(uuid.uuid4()),
                "source_tool": "trivy",
                "repository": repository,
                "file_path": target,
                "line_number": _object(misc.get("CauseMetadata"), "CauseMetadata").get("StartLine"),
                "severity": normalized,
                "severity_adjusted": normalized,
                "title": misc.get("Title", "Misconfiguration de IaC"),
                "description": misc.get("Description"),
                "cve_id": None,
                "iac_internet_exposed": None,
                "raw_output": json.dumps(misc),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            alerts.append(alert)

    return alerts


def normalize(tool: str, raw_json_str: str, repository: str) -> list[dict]:
    """
    Ponto de entrada principal da normalização ASU.
    Recebe o tool name e o JSON bruto como string.
    Retorna lista de alertas normalizados.
    """
    try:
        raw_data = json.loads(raw_json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON inválido recebido de {tool}: {e}")

    if not isinstance(raw_data, dict):
        raise ValueError("O resultado do scanner deve ser um objeto JSON")

    if tool == "semgrep":
        alerts = parse_semgrep(raw_data, repository)
    elif tool == "trivy":
        alerts = parse_trivy(raw_data, repository)
    else:
        # Ferramenta desconhecida — salva como alerta genérico sem quebrar
        alerts = [{
            "id": str(uuid.uuid4()),
            "source_tool": tool,
            "repository": repository,
            "file_path": None,
            "line_number": None,
            "severity": "INFO",
            "severity_adjusted": "INFO",
            "title": f"Scan recebido de ferramenta desconhecida: {tool}",
            "description": "Normalização ASU não disponível para esta ferramenta",
            "cve_id": None,
            "iac_internet_exposed": None,
            "raw_output": raw_json_str,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]

    # Reject incompatible scanner values before any write, including PostgreSQL
    # varchar limits (SQLite alone does not enforce those limits in our tests).
    for alert in alerts:
        for field in ("title", "description", "file_path", "cve_id"):
            value = alert.get(field)
            if value is not None and not isinstance(value, str):
                raise ValueError(f"Campo {field} deve conter texto")
        if not alert.get("title") or len(alert["title"]) > 500:
            raise ValueError("Campo title deve conter de 1 a 500 caracteres")
        if len(alert.get("cve_id") or "") > 50:
            raise ValueError("Campo cve_id excede 50 caracteres")
        line = alert.get("line_number")
        if line is not None and (type(line) is not int or line < 0 or line > 2147483647):
            raise ValueError("Campo line_number deve ser um inteiro valido")
    return alerts
