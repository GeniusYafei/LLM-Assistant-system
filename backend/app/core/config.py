# backend/app/core/config.py
from pydantic import Field, AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Lorgan Backend"
    ENV: str = "local"

    model_config = SettingsConfigDict(extra="ignore")

    # ===== Security / Auth =====
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"

    BACKEND_CORS_ORIGINS: str = "http://localhost:9900,http://127.0.0.1:9900"

    # ===== Database =====
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://app_user:appuserpass@db:5432/local_test_db_lorgan",
        description="SQLAlchemy async URL",
    )

    # ===== LLM Service (Ollama) =====
    # Ollama API base URL (e.g., http://localhost:11434)
    OLLAMA_BASE_URL: AnyHttpUrl | str = "http://localhost:11434"
    # Default model name served by Ollama
    OLLAMA_MODEL: str = "qwen3:4b"
    # HTTP timeout (seconds) for Ollama requests
    OLLAMA_TIMEOUT: float = 60.0
    # Optional: JSON string of Ollama options (temperature, top_p, seed, reasoning, etc.)
    OLLAMA_OPTIONS_JSON: str | None = None

    # ===== Filesystem storage =====
    # File storage root directory (directory in container)
    STORAGE_ROOT: str = Field(
        default="/app/storage/uploads",
        description="Root directory for file storage"
    )

    # ===== Storage / Quota =====
    # Single user quota in bytes (100 MB)
    QUOTA_DEFAULT_LIMIT_BYTES: int = 104857600
    # 80% warning threshold
    QUOTA_WARN_RATIO: float = 0.8
    QUOTA_AUTO_ARCHIVE_ON_LIMIT: bool = False
    QUOTA_AUTO_ARCHIVE_RELEASE_RATIO: float = 0.2  # Earliest 20% auto-release

    # ===== Email settings =====
    # Password reset code settings
    PASSWORD_RESET_CODE_LENGTH: int = 6
    PASSWORD_RESET_CODE_TTL_MINUTES: int = 5
    PASSWORD_RESET_DEV_CODE: str | None = Field(
        default=None,
        description="Optional bypass code for development password resets",
    )


settings = Settings()
