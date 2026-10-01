import json
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.exc import OperationalError, IntegrityError, TimeoutError
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from models import Alert, Repository, User
from routes import scan
from services.db_engine import build_engine

TEST_KEY = "test-integration-key"


def payload(tool="semgrep", count=2):
    report = {"results": [
        {"check_id": f"rule-{i}", "path": "app.py", "start": {"line": i + 1},
         "extra": {"severity": "error", "message": "test finding"}}
        for i in range(count)
    ]}
    if tool == "trivy":
        report = {"Results": [{"Target": "main.tf", "Misconfigurations": [
            {"Title": "Public bucket", "Severity": "HIGH", "CauseMetadata": None}
        ]}]}
    return {"tool": tool, "repository": "test-owner/test-repo", "raw_json": json.dumps(report)}


@pytest.fixture
def api(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'scan.db'}",
                          connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory.begin() as db:
        db.add(User(email="scan@example.test", hashed_password="unused",
                    company_name="Test account", api_key=TEST_KEY,
                    discord_webhook_url="https://example.test/webhook"))

    def dependency():
        with factory() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise

    app = FastAPI()
    app.include_router(scan.router, prefix="/api")
    app.dependency_overrides[get_db] = dependency
    sent = []

    def notify(*args):
        # The notification must see the committed scan from another connection.
        with factory() as db:
            assert db.query(Alert).count() > 0
        sent.append(args)

    monkeypatch.setattr(scan, "send_discord_alert", notify)
    with TestClient(app) as client:
        yield client, engine, factory, sent
    engine.dispose()


def post(api, body=None, key=TEST_KEY):
    headers = {"X-Apex-Api-Key": key} if key is not None else {}
    return api[0].post("/api/scan", json=body or payload(), headers=headers)


def counts(api):
    with api[2]() as db:
        return db.query(Repository).count(), db.query(Alert).count()


@pytest.mark.parametrize("tool,expected", [("semgrep", 2), ("trivy", 1)])
def test_valid_scan_commits_all_alerts_and_then_notifies(api, tool, expected):
    response = post(api, payload(tool))
    assert response.status_code == 201
    assert response.json()["alerts_saved"] == expected
    assert response.json()["account"] == "Test account"
    assert len(response.json()["alert_ids"]) == expected
    assert counts(api) == (1, expected)
    assert len(api[3]) == expected
    with api[2]() as db:
        assert all(alert.user_id is not None for alert in db.query(Alert))


def test_repeated_repository_does_not_break_second_scan(api):
    assert post(api).status_code == 201
    assert post(api).status_code == 201
    assert counts(api) == (1, 4)


def test_invalid_key_is_not_silently_saved_as_legacy(api):
    assert post(api, key="invalid-test-key").status_code == 401
    assert counts(api) == (0, 0)


def test_missing_key_keeps_documented_legacy_mode(api):
    assert post(api, key=None).status_code == 201
    with api[2]() as db:
        assert all(alert.user_id is None for alert in db.query(Alert))
    assert api[3] == []


@pytest.mark.parametrize("report", [None, [], {"results": {}},
    {"results": [None]}, {"results": [{"extra": {"severity": 9}}]},
    {"results": [{"check_id": "a" * 501}]},
    {"results": [{"start": {"line": "not-an-integer"}}]}])
def test_invalid_scanner_shapes_return_400_without_writes(api, report):
    body = payload()
    body["raw_json"] = json.dumps(report)
    assert post(api, body).status_code == 400
    assert counts(api) == (0, 0)


def test_invalid_json_never_registers_repository(api):
    body = payload()
    body["raw_json"] = "invalid-json"
    assert post(api, body).status_code == 400
    assert counts(api) == (0, 0)


def test_cve_list_is_normalized_and_preserved_in_raw_output(api):
    report = {"results": [{"check_id": "rule-cve", "extra": {
        "metadata": {"cve": ["CVE-2026-1000", "CVE-2026-2000"]}
    }}]}
    body = payload()
    body["raw_json"] = json.dumps(report)
    assert post(api, body).status_code == 201
    with api[2]() as db:
        alert = db.query(Alert).one()
        assert alert.cve_id == "CVE-2026-1000"
        assert "CVE-2026-2000" in alert.raw_output


@pytest.mark.parametrize("break_at", ["repository", "second_alert"])
def test_actual_disconnect_rolls_back_and_next_request_recovers(api, break_at):
    inserts = 0

    def disconnect(conn, cursor, statement, parameters, context, executemany):
        nonlocal inserts
        if statement.startswith("INSERT INTO alerts"):
            inserts += 1
        should_break = (
            break_at == "repository" and "FROM repositories" in statement
        ) or (break_at == "second_alert" and inserts == 2 and statement.startswith("INSERT INTO alerts"))
        if should_break:
            # Real DBAPI connection closure, detected/invalidated by SQLAlchemy.
            conn.connection.driver_connection.close()

    event.listen(api[1], "before_cursor_execute", disconnect)
    try:
        response = post(api)
        assert response.status_code == 503
    finally:
        event.remove(api[1], "before_cursor_execute", disconnect)
    assert counts(api) == (0, 0)
    assert api[3] == []
    assert post(api).status_code == 201
    assert counts(api) == (1, 2)


@pytest.mark.parametrize("error,status", [
    (OperationalError(None, {}, RuntimeError("SSL connection closed"), connection_invalidated=True), 503),
    (IntegrityError(None, {"key": "secret-marker"}, RuntimeError("real constraint failure")), 500),
    (OperationalError(None, {}, RuntimeError("real query failure")), 500),
    (TimeoutError("pool exhausted"), 503),
])
def test_database_errors_are_explicit_and_sensitive_parameters_are_not_logged(api, error, status, caplog):
    def fail(*args):
        raise error
    event.listen(api[1], "before_cursor_execute", fail)
    try:
        response = post(api)
        assert response.status_code == status
    finally:
        event.remove(api[1], "before_cursor_execute", fail)
    assert counts(api) == (0, 0)
    assert "secret-marker" not in caplog.text
    assert api[3] == []


def test_lost_commit_acknowledgement_is_not_retried_or_notified(api):
    attempts = []
    def fail_commit(conn):
        attempts.append(1)
        raise OperationalError(None, {}, RuntimeError("lost commit acknowledgement"),
                               connection_invalidated=True)
    event.listen(api[1], "commit", fail_commit)
    try:
        assert post(api).status_code == 503
    finally:
        event.remove(api[1], "commit", fail_commit)
    assert len(attempts) == 1
    assert api[3] == []


def test_discord_failure_does_not_undo_committed_scan(api, monkeypatch):
    def fail(*args):
        raise RuntimeError("notification unavailable")
    monkeypatch.setattr(scan, "send_discord_alert", fail)
    assert post(api).status_code == 201
    assert counts(api) == (1, 2)
