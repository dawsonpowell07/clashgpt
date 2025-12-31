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
    local_db_user: str = "postgres"
    local_db_name: str = "postgres"
    local_db_host: str = "localhost"
    local_db_port: int = 5432

    # Google Cloud
    connection_name: str | None = None

    # Application
    dev_mode: bool = False

    # Google Cloud Storage
    logs_bucket_name: str | None = None

    # MongoDB
    mongodb_uri: str = ""
    mongodb_database: str = ""


# Create a global settings instance
settings = Settings()
