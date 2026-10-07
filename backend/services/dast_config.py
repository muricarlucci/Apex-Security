# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import os
from dataclasses import dataclass

DEFAULT_TRAINING_HOSTS = "testphp.vulnweb.com,demo.testfire.net,public-firing-range.appspot.com"
LAB_URL = "http://localhost:3000"
FINAL_STATUSES = {"completed", "failed", "timeout"}


@dataclass(frozen=True)
class DastConfig:
    secret: str
    daily_limit: int
    ttl_minutes: int
    active_enabled: bool
    training_hosts: tuple
    workflow: str
    ref: str
    github_token: str
    github_repo: str


def get_dast_config():
    return DastConfig(
        secret=os.getenv("DAST_CALLBACK_SECRET", "").strip(),
        daily_limit=max(1, int(os.getenv("DAST_DAILY_LIMIT", "5"))),
        ttl_minutes=max(1, int(os.getenv("DAST_CALLBACK_TTL_MINUTES", "45"))),
        active_enabled=os.getenv("DAST_ENABLE_ACTIVE", "true").strip().lower() == "true",
        training_hosts=tuple(host.strip().lower().rstrip(".") for host in os.getenv("DAST_TRAINING_HOSTS", DEFAULT_TRAINING_HOSTS).split(",") if host.strip()),
        workflow=os.getenv("DAST_WORKFLOW_FILE", "apex-dast.yml"),
        ref=os.getenv("DAST_WORKFLOW_REF", "main"),
        github_token=os.getenv("GITHUB_TOKEN", "").strip(),
        github_repo=os.getenv("GITHUB_REPO", "muricarlucci/Apex-Security"),
    )
