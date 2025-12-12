# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, chat, files, analytics, account, admin, passwd_reset, quota

app = FastAPI(title=settings.APP_NAME)

# CORS
origins = [origin.strip() for origin in settings.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route
app.include_router(auth.router, prefix="/api/v1")
app.include_router(passwd_reset.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(quota.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(account.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


# Health check endpoint
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
