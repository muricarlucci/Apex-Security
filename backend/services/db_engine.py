# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
from sqlalchemy import create_engine


def build_engine(database_url, **kwargs):
    """Replace stale connections at checkout; recycle by age, not idle time."""
    return create_engine(
        database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        hide_parameters=True,
        **kwargs,
    )
