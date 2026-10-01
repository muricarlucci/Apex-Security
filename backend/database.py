from sqlalchemy import text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os
from services.db_engine import build_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:SUA_SENHA@localhost:5432/apex_db")

engine = build_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Colunas adicionadas depois que as tabelas ja existiam em producao.
# Base.metadata.create_all() cria tabelas novas mas NAO altera tabelas existentes,
# entao estas colunas precisam ser adicionadas explicitamente. Todas as operacoes
# sao ADITIVAS e idempotentes (ADD COLUMN IF NOT EXISTS) — nenhum dado e apagado.
_ADDITIVE_COLUMNS = [
    ("alerts", "user_id", "INTEGER"),
    ("repositories", "user_id", "INTEGER"),
    ("remediations", "user_id", "INTEGER"),
    ("pull_requests", "user_id", "INTEGER"),
    ("company_profile", "user_id", "INTEGER"),
    ("risk_assessments", "user_id", "INTEGER"),
    ("risk_assessments", "sla_deadline", "VARCHAR(100)"),
    ("risk_assessments", "sla_reasoning", "TEXT"),
    ("risk_assessments", "compliance_risk_level", "VARCHAR(20)"),
    ("users", "discord_webhook_url", "VARCHAR(500)"),
]


def run_additive_migrations():
    """
    Aplica migracoes aditivas em tabelas que ja existem no banco.
    Seguro para rodar a cada start: usa IF NOT EXISTS e nunca faz DROP.
    """
    applied = []
    try:
        with engine.begin() as conn:
            for table, column, coltype in _ADDITIVE_COLUMNS:
                conn.execute(text(
                    f"ALTER TABLE IF EXISTS {table} ADD COLUMN IF NOT EXISTS {column} {coltype}"
                ))
                applied.append(f"{table}.{column}")
            # Indices para as consultas multi-tenant (filtram sempre por user_id)
            for table, column, _ in _ADDITIVE_COLUMNS:
                if column == "user_id":
                    conn.execute(text(
                        f"CREATE INDEX IF NOT EXISTS ix_{table}_user_id ON {table} ({column})"
                    ))
        print(f"[OK] Migracoes aditivas aplicadas ({len(applied)} colunas verificadas)")
    except Exception as e:
        print(f"[ERRO] Falha ao aplicar migracoes aditivas: {e}")
        raise


def test_connection():
    # Marcadores ASCII em vez de emoji: o console do Windows (cp1252) não
    # imprime ✅/❌ e o UnicodeEncodeError derrubava o startup do uvicorn.
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[OK] Banco de dados conectado com sucesso")
        return True
    except Exception as e:
        print(f"[ERRO] Erro ao conectar ao banco: {e}")
        return False
