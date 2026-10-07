# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import os


def get_allowed_origins() -> list[str]:
    """Return local, dashboard and presentation-site origins for CORS."""
    origins = ["http://localhost:5173", "http://localhost:3000"]
    for var in ("FRONTEND_URL", "SITE_URL"):
        value = (os.getenv(var) or "").strip().rstrip("/")
        if value and value not in origins:
            origins.append(value)
    return origins
