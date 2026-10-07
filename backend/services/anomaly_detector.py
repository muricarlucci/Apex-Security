# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from models import Alert

# SINAL CONSULTIVO E ADITIVO: este modulo NAO substitui o prioritizer.py.
# As regras deterministicas do Modulo 3 continuam sendo o motor oficial e
# explicavel de priorizacao. O Isolation Forest oferece apenas uma segunda
# opiniao estatistica sobre quais alertas fogem do padrao da base.

SEVERITY_WEIGHTS = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}


def _extract_features(alert: Alert) -> list:
    """Extrai features numericas de um alerta para o modelo."""
    return [
        SEVERITY_WEIGHTS.get(alert.severity, 0),
        1 if alert.cve_id else 0,
        1 if alert.iac_internet_exposed else 0,
        len(alert.title or ""),
    ]


def train_and_score(db: Session, user_id: int = None) -> dict:
    """
    Treina um Isolation Forest com os alertas da conta informada
    e retorna um score de anomalia para cada um.
    Requer um minimo de alertas para ser estatisticamente significativo.
    """
    query = db.query(Alert)
    if user_id is not None:
        query = query.filter(Alert.user_id == user_id)
    alerts = query.all()
    if len(alerts) < 10:
        return {
            "trained": False,
            "reason": f"Dados insuficientes para treino (minimo 10, atual {len(alerts)})",
            "scores": {}
        }

    X = np.array([_extract_features(a) for a in alerts])
    model = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
    model.fit(X)

    raw_scores = model.decision_function(X)
    predictions = model.predict(X)

    scores = {}
    for alert, raw_score, pred in zip(alerts, raw_scores, predictions):
        scores[alert.id] = {
            "anomaly_score": round(float(raw_score), 4),
            "is_anomaly": bool(pred == -1),
        }

    return {
        "trained": True,
        "total_analyzed": len(alerts),
        "anomalies_found": sum(1 for s in scores.values() if s["is_anomaly"]),
        "scores": scores
    }
