"""
Embedding Service

Async service for generating embeddings for RAG search.
"""
import logging
from typing import List

import openai

from app.settings import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Async service for generating embeddings.

    Uses OpenAI-compatible embedding API for generating vector embeddings.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None
    ):
        """
        Initialize the embedding service.

        Args:
            api_key: API key for embedding provider. If not provided, uses settings.
            base_url: Base URL for embedding API. If not provided, uses settings.
            model: Embedding model to use. If not provided, uses settings.
        """
        if api_key is None:
            api_key = settings.embedding_api_key
        if base_url is None:
            base_url = settings.embedding_base_url
        if model is None:
            model = settings.embedding_model

        logger.info(f"Initializing embedding service | model={model}")
        self.client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed

        Returns:
            Embedding vector as list of floats
        """
        try:
            response = await self.client.embeddings.create(
                model=self.model, input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.exception(f"Failed to generate embedding: {e}")
            raise


# Singleton instance
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """
    Get or create the embedding service singleton.

    Returns:
        EmbeddingService instance
    """
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
