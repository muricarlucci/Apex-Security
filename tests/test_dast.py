# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
"""Offline DAST contracts: DNS, GitHub, Discord and scanner mocked."""
import copy
import hashlib
import hmac
import json
import socket
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from github import GithubException
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from models import Alert, DastScan, User
from routes import dast, scan as scan_routes
from services.auth import get_current_user
from services import dast_runner, dast_validator
from services.dast_config import get_dast_config
from services.dast_normalizer import normalize_zap
from services.db_engine import build_engine

REPORT = json.loads((Path(__file__).parent / "fixtures/zap-traditional.json").read_text())
SECRET = "offline-only-callback-secret"


@pytest.fixture(autouse=True)
def offline_config(monkeypatch):
    for key, value in {"DAST_CALLBACK_SECRET": SECRET, "GITHUB_TOKEN": "offline-token", "DAST_DAILY_LIMIT": "5",
        "DAST_ENABLE_ACTIVE": "true", "DAST_CALLBACK_TTL_MINUTES": "45",
        "DAST_TRAINING_HOSTS": "testphp.vulnweb.com,demo.testfire.net,public-firing-range.appspot.com"}.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setattr(dast_validator.socket, "getaddrinfo", lambda *a, **kw:
        [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))])


@pytest.mark.parametrize("url", ["https://example.org/path?q=value", "http://example.org:8080", "https://8.8.8.8", "https://[2606:4700:4700::1111]"])
def test_public_urls(url):
    assert dast_validator.validate_target_url(url).startswith(("http://", "https://"))


@pytest.mark.parametrize("url", [None, "", "ftp://example.org", "file:///etc/passwd", "https://u:p@example.org",
    "http://localhost", "http://app.local", "http://app.internal", "http://sub.localhost", "http://127.0.0.1",
    "http://10.1.2.3", "http://169.254.169.254", "http://172.16.0.1", "http://192.168.1.1", "http://0.0.0.0",
    "http://100.64.0.1", "http://224.0.0.1", "http://[::1]", "http://[fc00::1]", "http://[fe80::1]",
    "http://[ff02::1]", "http://[::ffff:127.0.0.1]", "https://example.org#x", "https://example.org/$(x)",
    "https://example.org/; echo hi", "https://example.org\\@localhost", "https://example.org:99999", "https://example.org/" + "x" * 2048])
def test_rejected_urls(url):
    with pytest.raises(ValueError):
        dast_validator.validate_target_url(url)


@pytest.mark.parametrize("address", ["127.0.0.1", "10.1.2.3", "169.254.169.254", "192.168.1.2", "::1", "fc00::1", "ff02::1"])
def test_one_non_public_dns_answer_rejects_entire_host(monkeypatch, address):
    monkeypatch.setattr(dast_validator.socket, "getaddrinfo", lambda *a, **kw: [
        (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443)),
        (socket.AF_INET6, socket.SOCK_STREAM, 6, "", (address, 443))])
    with pytest.raises(ValueError, match="nao publico"):
        dast_validator.validate_target_url("https://example.org")


def test_unresolvable_dns(monkeypatch):
    def fail(*a, **kw):
        raise socket.gaierror()
    monkeypatch.setattr(dast_validator.socket, "getaddrinfo", fail)
    with pytest.raises(ValueError, match="DNS"):
        dast_validator.validate_target_url("https://example.org")


def test_normalization_without_prioritization(monkeypatch):
    import services.prioritizer as prioritizer
    monkeypatch.setattr(prioritizer, "prioritize", lambda *a: pytest.fail("DAST must never use IaC rules"))
    alert = normalize_zap(REPORT, "http://localhost:3000", "lab")[0]
    assert alert["source_tool"] == "zap" and alert["scan_type"] == "DAST"
    assert alert["repository"] == "dast:juice-shop-lab"
    assert alert["severity"] == alert["severity_adjusted"] == "HIGH"
    assert alert["cwe_id"] == "79" and alert["cve_id"] is None and alert["line_number"] is None
    assert alert["file_path"] == "http://localhost:3000/test?q=1"
    assert alert["solution"] == "Encode output for its context."
    assert "<p>" not in alert["description"] and "Instancias: 2" in alert["description"]


@pytest.mark.parametrize("risk,severity", [("3", "HIGH"), ("2", "MEDIUM"), ("1", "LOW"), ("0", "INFO"), ("9", "INFO")])
def test_zap_severity_and_instances(risk, severity):
    report = copy.deepcopy(REPORT)
    raw = report["site"][0]["alerts"][0]
    raw["riskcode"] = risk
    raw["instances"] *= 15
    alert = normalize_zap(report, "https://example.org", "custom")[0]
    assert alert["repository"] == "dast:example.org" and alert["severity_adjusted"] == severity
    assert "Instancias: 30" in alert["description"] and len(json.loads(alert["raw_output"])["instances"]) == 20
    assert alert["description"].count("http://localhost:3000/test") == 5


@pytest.mark.parametrize("report", [None, [], {}, {"site": {}}, {"site": [None]}, {"site": [{"alerts": [None]}]}, {"site": [{"alerts": [{"instances": [None]}]}]}])
def test_invalid_report(report):
    with pytest.raises(ValueError):
        normalize_zap(report, "http://localhost:3000", "lab")


@pytest.fixture
def api(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'dast.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory.begin() as db:
        db.add_all([User(id=i, email=f"dast{i}@example.test", hashed_password="unused", api_key=f"offline-key-{i}",
                        discord_webhook_url="https://example.test/webhook") for i in (1, 2)])
    def dependency():
        with factory() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise
    def user(request: Request):
        return SimpleNamespace(id=int(request.headers.get("X-Test-User", "1")))
    app = FastAPI()
    app.include_router(dast.router, prefix="/api")
    app.include_router(scan_routes.router, prefix="/api")
    app.dependency_overrides[get_db] = dependency
    app.dependency_overrides[get_current_user] = user
    dispatched, notifications = [], []
    monkeypatch.setattr(dast, "dispatch_dast", lambda row, cfg: dispatched.append(row.id))
    def notify(*args):
        with factory() as db:
            assert db.query(DastScan).filter(DastScan.status == "completed").count() > 0
        notifications.append(args)
    monkeypatch.setattr(dast, "send_discord_alert", notify)
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client, factory, dispatched, notifications, engine
    engine.dispose()


def create(api, **kwargs):
    return api[0].post("/api/dast/scans", json={"target_kind": "lab", **kwargs})


def callback(api, scan_id, body=None, signature=None):
    if signature is None:
        with api[1]() as db:
            row = db.get(DastScan, scan_id)
            signature = hmac.new(SECRET.encode(), f"{row.id}:{row.nonce}".encode(), hashlib.sha256).hexdigest()
    return api[0].post(f"/api/dast/scans/{scan_id}/results", json=body or {"status": "completed", "report": REPORT}, headers={"X-Apex-Dast-Signature": signature})


def test_lifecycle_is_atomic_isolated_and_replay_safe(api):
    response = create(api, mode="full")
    assert response.status_code == 202 and api[2] == [response.json()["id"]]
    data = response.json()
    assert "nonce" not in data and "secret" not in data
    scan_id = data["id"]
    assert callback(api, scan_id, {"status": "running"}).json()["status"] == "running"
    assert callback(api, scan_id).json()["alerts_count"] == 1
    assert callback(api, scan_id).status_code == 409
    assert callback(api, scan_id, {"status": "failed"}).status_code == 409
    assert len(api[3]) == 1
    assert api[0].get(f"/api/dast/scans/{scan_id}", headers={"X-Test-User": "2"}).status_code == 404
    assert api[0].get("/api/dast/scans", headers={"X-Test-User": "2"}).json() == []
    alerts = api[0].get("/api/alerts?scan_type=DAST&source_tool=zap").json()
    assert len(alerts) == 1 and alerts[0]["solution"] and alerts[0]["cwe_id"] == "79"
    assert api[0].get("/api/alerts", headers={"X-Test-User": "2"}).json() == []


@pytest.mark.parametrize("signature", ["", "0" * 64, "not-a-signature", "z" * 64])
def test_invalid_hmac_does_not_change_scan(api, signature):
    scan_id = create(api).json()["id"]
    assert callback(api, scan_id, signature=signature).status_code == 401
    with api[1]() as db:
        assert db.get(DastScan, scan_id).status == "queued" and db.query(Alert).count() == 0


def test_missing_secret_prevents_dispatch(api, monkeypatch):
    monkeypatch.delenv("DAST_CALLBACK_SECRET")
    assert create(api).status_code == 503 and api[2] == []
    assert not api[0].get("/api/dast/config").json()["configured"]


def test_per_user_active_and_daily_limits(api):
    scan_id = create(api).json()["id"]
    assert create(api).status_code == 409
    assert api[0].post("/api/dast/scans", json={"target_kind": "lab"}, headers={"X-Test-User": "2"}).status_code == 202
    callback(api, scan_id, {"status": "failed"})
    for _ in range(4):
        scan_id = create(api).json()["id"]
        callback(api, scan_id, {"status": "failed"})
    assert create(api).status_code == 429 and api[0].get("/api/dast/config").json()["remaining_today"] == 0


@pytest.mark.parametrize("url,mode,ack,expected", [("https://example.org", "baseline", False, 400),
    ("https://example.org", "full", True, 400), ("https://testphp.vulnweb.com", "full", True, 202),
    ("https://example.org", "baseline", True, 202), ("http://127.0.0.1", "baseline", True, 400)])
def test_custom_authorization_and_active_allowlist(api, url, mode, ack, expected):
    response = create(api, target_kind="custom", target_url=url, mode=mode, authorization_ack=ack)
    assert response.status_code == expected
    if expected == 202:
        with api[1]() as db:
            row = db.get(DastScan, response.json()["id"])
            assert row.authorization_ack and row.authorization_ack_at and row.user_id == 1


def test_active_disable_and_strict_ack(api, monkeypatch):
    monkeypatch.setenv("DAST_ENABLE_ACTIVE", "false")
    assert create(api, mode="full").status_code == 400
    assert create(api, target_kind="custom", target_url="https://example.org", authorization_ack="true").status_code == 422


def test_expiry_from_callback_and_read(api):
    scan_id = create(api).json()["id"]
    with api[1].begin() as db:
        db.get(DastScan, scan_id).callback_expires_at = dast.utcnow() - timedelta(seconds=1)
    assert callback(api, scan_id).status_code == 410
    assert api[0].get(f"/api/dast/scans/{scan_id}").json()["status"] == "timeout"
    next_id = create(api).json()["id"]
    with api[1].begin() as db:
        db.get(DastScan, next_id).callback_expires_at = dast.utcnow() - timedelta(seconds=1)
    assert api[0].get("/api/dast/scans").json()[0]["status"] == "timeout"


@pytest.mark.parametrize("body", [{"status": "completed", "report": {}}, {"status": "completed", "report": REPORT, "mode": "full"}, {"status": "unknown"}])
def test_malformed_callback_fails_without_partial_alerts(api, body):
    scan_id = create(api).json()["id"]
    assert callback(api, scan_id, body).status_code == 400
    with api[1]() as db:
        assert db.get(DastScan, scan_id).status == "failed" and db.query(Alert).count() == 0


def test_callback_size_is_bounded(api):
    scan_id = create(api).json()["id"]
    assert api[0].post(f"/api/dast/scans/{scan_id}/results", content=b"x" * (dast.MAX_CALLBACK_BYTES + 1)).status_code == 413


def test_database_failure_rolls_back_entire_result(api):
    scan_id = create(api).json()["id"]
    def fail(conn, cursor, statement, parameters, context, executemany):
        if statement.startswith("INSERT INTO alerts"):
            raise RuntimeError("offline injected database failure")
    event.listen(api[4], "before_cursor_execute", fail)
    try:
        assert callback(api, scan_id).status_code == 500
    finally:
        event.remove(api[4], "before_cursor_execute", fail)
    with api[1]() as db:
        assert db.query(Alert).count() == 0 and db.get(DastScan, scan_id).status == "queued"
    assert api[3] == []


def test_dispatch_failure_is_saved(api, monkeypatch):
    def fail(*a):
        raise RuntimeError("Token do GitHub invalido ou expirado")
    monkeypatch.setattr(dast, "dispatch_dast", fail)
    assert create(api).status_code == 502
    assert api[0].get("/api/dast/scans").json()[0]["status"] == "failed"


def test_discord_failure_cannot_undo_completion(api, monkeypatch):
    def fail(*a):
        raise RuntimeError("offline notification failure")
    monkeypatch.setattr(dast, "send_discord_alert", fail)
    scan_id = create(api).json()["id"]
    assert callback(api, scan_id).status_code == 200 and callback(api, scan_id).status_code == 409


def test_runner_dispatch_inputs_have_no_secret(monkeypatch):
    client = MagicMock()
    client.__enter__.return_value = client
    workflow = client.get_repo.return_value.get_workflow.return_value
    workflow.create_dispatch.return_value = True
    constructor = MagicMock(return_value=client)
    monkeypatch.setattr(dast_runner, "Github", constructor)
    row = SimpleNamespace(id=17, nonce="a" * 64, target_kind="lab", target_url="http://localhost:3000", mode="baseline")
    assert "apex-dast.yml" in dast_runner.dispatch_dast(row, get_dast_config())
    payload = workflow.create_dispatch.call_args.kwargs["inputs"]
    assert payload["nonce"] == row.nonce and SECRET not in json.dumps(payload) and "secret" not in payload
    assert constructor.call_args.kwargs["retry"] == 0


@pytest.mark.parametrize("status", [401, 403, 404, 500])
def test_runner_sanitizes_provider_errors(monkeypatch, status):
    client = MagicMock()
    client.__enter__.return_value = client
    client.get_repo.side_effect = GithubException(status, {"message": "provider-sensitive-marker"})
    monkeypatch.setattr(dast_runner, "Github", MagicMock(return_value=client))
    with pytest.raises(RuntimeError) as error:
        dast_runner.dispatch_dast(SimpleNamespace(), get_dast_config())
    assert "provider-sensitive-marker" not in str(error.value)
