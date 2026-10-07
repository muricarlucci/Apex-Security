# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from services.auth import hash_password, verify_password, create_access_token, get_current_user
from services.discord_notifier import send_discord_alert
from pydantic import BaseModel, EmailStr

router = APIRouter()


class SignupPayload(BaseModel):
    email: EmailStr
    password: str
    company_name: str


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


@router.post("/auth/signup", status_code=201)
def signup(payload: SignupPayload, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ja cadastrado")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        company_name=payload.company_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "api_key": user.api_key,
        "company_name": user.company_name
    }


@router.post("/auth/login")
def login(payload: LoginPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    token = create_access_token(user.id, user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "api_key": user.api_key,
        "company_name": user.company_name
    }


@router.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "company_name": current_user.company_name,
        "api_key": current_user.api_key,
        "discord_webhook_url": current_user.discord_webhook_url
    }


@router.post("/auth/regenerate-key")
def regenerate_api_key(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Invalida a chave antiga e gera uma nova — exige atualizar o secret no GitHub."""
    current_user.api_key = secrets.token_hex(32)
    db.commit()
    return {"api_key": current_user.api_key}


class DiscordWebhookPayload(BaseModel):
    webhook_url: str


@router.post("/auth/discord-webhook")
def save_discord_webhook(payload: DiscordWebhookPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.discord_webhook_url = payload.webhook_url
    db.commit()
    return {"message": "Webhook do Discord salvo com sucesso"}


@router.post("/auth/discord-webhook/test")
def test_discord_webhook(current_user: User = Depends(get_current_user)):
    if not current_user.discord_webhook_url:
        raise HTTPException(status_code=400, detail="Nenhum webhook configurado")
    success = send_discord_alert(
        current_user.discord_webhook_url,
        "Notificacao de teste — integracao funcionando",
        "INFO",
        current_user.company_name or "sua empresa"
    )
    if not success:
        raise HTTPException(status_code=502, detail="Falha ao enviar — verifique a URL do webhook")
    return {"message": "Notificacao de teste enviada com sucesso"}
