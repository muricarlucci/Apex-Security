import pytest
from sqlalchemy import text
from services.db_engine import build_engine
import database


def test_postgres_dialect_recognizes_the_reported_ssl_disconnect():
    from types import SimpleNamespace
    from sqlalchemy.dialects.postgresql.psycopg2 import PGDialect_psycopg2
    import psycopg2
    dialect = PGDialect_psycopg2(dbapi=psycopg2)
    error = psycopg2.OperationalError("SSL connection has been closed unexpectedly")
    assert dialect.is_disconnect(error, SimpleNamespace(closed=False), None)


def test_pre_ping_replaces_actual_stale_idle_connection(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'pool.db'}")
    try:
        with engine.connect() as conn:
            old_connection = conn.connection.driver_connection
            conn.execute(text("SELECT 1"))
        # Mimic the database/provider terminating an idle pooled connection.
        old_connection.close()
        with engine.connect() as conn:
            assert conn.execute(text("SELECT 1")).scalar_one() == 1
            assert conn.connection.driver_connection is not old_connection
    finally:
        engine.dispose()


def test_recycle_replaces_aged_connection_at_checkout(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'recycle.db'}")
    from sqlalchemy.pool import base
    original_time = base.time.time
    try:
        with engine.connect() as conn:
            old_connection = conn.connection.driver_connection
        monkeypatch.setattr(base.time, "time", lambda: original_time() + 301)
        with engine.connect() as conn:
            assert conn.connection.driver_connection is not old_connection
            assert conn.execute(text("SELECT 1")).scalar_one() == 1
    finally:
        engine.dispose()


def test_get_db_rolls_back_and_closes_on_error(monkeypatch):
    calls = []
    class FakeSession:
        def rollback(self):
            calls.append("rollback")
        def close(self):
            calls.append("close")
    monkeypatch.setattr(database, "SessionLocal", FakeSession)
    dependency = database.get_db()
    next(dependency)
    with pytest.raises(ValueError, match="original error"):
        dependency.throw(ValueError("original error"))
    assert calls == ["rollback", "close"]


def test_failed_migration_is_not_reported_as_success(monkeypatch):
    class BrokenEngine:
        def begin(self):
            raise RuntimeError("migration failure")
    monkeypatch.setattr(database, "engine", BrokenEngine())
    with pytest.raises(RuntimeError, match="migration failure"):
        database.run_additive_migrations()
