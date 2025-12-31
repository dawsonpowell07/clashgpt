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
    mongodb_collection_documents: str = "documents"
    mongodb_collection_chunks: str = "chunks"
    mongodb_vector_index: str = "vector_index"
    mongodb_text_index: str = "text_index"

    # Embedding Configuration
    embedding_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_base_url: str = "https://api.openai.com/v1"
    embedding_dimension: int = 1536

    # RAG Search Configuration
    default_match_count: int = 10
    max_match_count: int = 50


# Create a global settings instance
settings = Settings()
