from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.intent_checker import check_intent_consistency
from services.auth import get_current_user
from models import User
from services.gemini_operations import gemini_operation

router = APIRouter()


class IntentCheckPayload(BaseModel):
    commit_message: str
    code_diff: str


@router.post("/intent-check")
@gemini_operation("intent", lambda values: values["payload"].model_dump())
def check_intent(payload: IntentCheckPayload, current_user: User = Depends(get_current_user)):
    """
    Verificador leve de consistencia entre mensagem de commit e diff real.
    Versao simplificada do Intent Engine da arquitetura original —
    nao integra com Jira/Trello, apenas compara commit vs codigo.
    Retorna alerta INFORMATIVO, nunca bloqueia PRs ou merges.
    """
    result = check_intent_consistency(payload.commit_message, payload.code_diff)
    return result
