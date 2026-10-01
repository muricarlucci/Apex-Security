from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, test_connection, run_additive_migrations
from services.cors_config import get_allowed_origins
from routes.scan import router as scan_router
from routes.remediate import router as remediate_router
from routes.pullrequest import router as pr_router
from routes.intent import router as intent_router
from routes.risk import router as risk_router
from routes.auth import router as auth_router
from routes.contact import router as contact_router

Base.metadata.create_all(bind=engine)
# create_all cria tabelas novas mas nao altera as existentes — aplica as colunas novas
run_additive_migrations()

app = FastAPI(
    title="Apex Security API",
    description="Plataforma ASPM — Apex Security v2.2",
    version="2.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(contact_router, prefix="/api", tags=["contact"])
app.include_router(scan_router, prefix="/api", tags=["scan"])
app.include_router(remediate_router, prefix="/api", tags=["remediation"])
app.include_router(pr_router, prefix="/api", tags=["pull-requests"])
app.include_router(intent_router, prefix="/api", tags=["intent"])
app.include_router(risk_router, prefix="/api", tags=["risk"])


@app.on_event("startup")
async def startup_event():
    test_connection()


@app.get("/")
def root():
    return {
        "service": "Apex Security API",
        "version": "2.2.0",
        "status": "online",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Apex Security API v2.2"}
