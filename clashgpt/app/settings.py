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

    # Production Database
    prod_db_user: str = "postgres"
    prod_db_password: str | None = None
    prod_db_name: str = "postgres"
    prod_db_host: str = "localhost"
    prod_db_port: int = 5432

    # Local Database
    local_db_user: str = "dawsonpowell"
    local_db_name: str = "clashgpt"
    local_db_host: str = "localhost"
    local_db_port: int = 5432

    # Google Cloud
    connection_name: str | None = None

    # Application
    dev_mode: bool = False
    backend_api_key: str = ""

    # Google Cloud Storage
    logs_bucket_name: str | None = None


# Create a global settings instance
settings = Settings()
