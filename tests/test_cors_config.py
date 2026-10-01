from services.cors_config import get_allowed_origins


LOCAL_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]


def test_both_production_origins(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://dashboard.example")
    monkeypatch.setenv("SITE_URL", "https://site.example")
    assert get_allowed_origins() == LOCAL_ORIGINS + [
        "https://dashboard.example", "https://site.example"
    ]


def test_only_dashboard_origin(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://dashboard.example")
    monkeypatch.delenv("SITE_URL", raising=False)
    assert get_allowed_origins() == LOCAL_ORIGINS + ["https://dashboard.example"]


def test_only_site_origin(monkeypatch):
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    monkeypatch.setenv("SITE_URL", "https://site.example")
    assert get_allowed_origins() == LOCAL_ORIGINS + ["https://site.example"]


def test_no_production_origins(monkeypatch):
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    monkeypatch.delenv("SITE_URL", raising=False)
    assert get_allowed_origins() == LOCAL_ORIGINS


def test_trims_spaces_and_trailing_slashes(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "  https://dashboard.example///  ")
    monkeypatch.setenv("SITE_URL", " https://site.example/ ")
    assert get_allowed_origins() == LOCAL_ORIGINS + [
        "https://dashboard.example", "https://site.example"
    ]


def test_duplicate_origin_is_not_repeated(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:5173/")
    monkeypatch.setenv("SITE_URL", "http://localhost:5173")
    assert get_allowed_origins() == LOCAL_ORIGINS


def test_empty_values_are_ignored(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "  ")
    monkeypatch.setenv("SITE_URL", " / ")
    assert get_allowed_origins() == LOCAL_ORIGINS
