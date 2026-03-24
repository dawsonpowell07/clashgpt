from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    allow_origins: str | list[str] = "http://localhost:3000,http://localhost:8000"

    @field_validator("allow_origins", mode="before")
    @classmethod
    def parse_allow_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # Clash Royale API
    clash_royale_api_token: str = ""

    # Local Database (dev mode — Supabase local)
    local_db_user: str = "postgres"
    local_db_password: str = "postgres"
    local_db_name: str = "postgres"
    local_db_host: str = "127.0.0.1"
    local_db_port: int = 5432

    # Cloud SQL Database (production)
    cloud_sql_username: str = ""
    cloud_sql_password: str = ""
    cloud_sql_connection_name: str = ""  # e.g. 'project:region:instance'
    cloud_sql_db_name: str = "postgres"

    # Application
    dev_mode: bool = False
    backend_api_key: str = ""

    # Clerk
    clerk_jwks_url: str = ""  # e.g. https://<clerk-domain>/.well-known/jwks.json

    # Telemetry
    logs_bucket_name: str = ""


# Create a global settings instance
settings = Settings()
