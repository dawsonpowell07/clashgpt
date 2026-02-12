from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Clash Royale API
    clash_royale_api_token: str = ""

    # Local Database (dev mode)
    local_db_user: str = "dawsonpowell"
    local_db_name: str = "clashgpt"
    local_db_host: str = "localhost"
    local_db_port: int = 5432

    # Supabase Database (production)
    supabase_db_password: str
    supabase_db_host: str
    supabase_db_port: int
    supabase_db_name: str
    supabase_db_user: str

    # Application
    dev_mode: bool = False
    backend_api_key: str = ""

    # Telemetry
    logs_bucket_name: str = ""


# Create a global settings instance
settings = Settings()
