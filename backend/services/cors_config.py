import os


def get_allowed_origins() -> list[str]:
    """Return local, dashboard and presentation-site origins for CORS."""
    origins = ["http://localhost:5173", "http://localhost:3000"]
    for var in ("FRONTEND_URL", "SITE_URL"):
        value = (os.getenv(var) or "").strip().rstrip("/")
        if value and value not in origins:
            origins.append(value)
    return origins
