# """
# Embedding Service

# Async service for generating embeddings for RAG search.
# """
# import logging

# import openai

# from app.settings import settings

# logger = logging.getLogger(__name__)


# class EmbeddingServiceError(Exception):
#     """Base exception for embedding service errors."""


# class EmbeddingAuthError(EmbeddingServiceError):
#     """Raised when authentication or credentials are invalid."""


# class EmbeddingRateLimitError(EmbeddingServiceError):
#     """Raised when the embedding API rate limit is exceeded."""


# class EmbeddingNetworkError(EmbeddingServiceError):
#     """Raised when network/connection errors occur."""


# class EmbeddingTimeoutError(EmbeddingServiceError):
#     """Raised when the embedding request times out."""


# class EmbeddingAPIError(EmbeddingServiceError):
#     """Raised for API errors from the embedding provider."""


# class EmbeddingDataError(EmbeddingServiceError):
#     """Raised when embedding response data is malformed."""


# class EmbeddingService:
#     """
#     Async service for generating embeddings.

#     Uses OpenAI-compatible embedding API for generating vector embeddings.
#     """

#     def __init__(
#         self,
#         api_key: str | None = None,
#         base_url: str | None = None,
#         model: str | None = None
#     ):
#         """
#         Initialize the embedding service.

#         Args:
#             api_key: API key for embedding provider. If not provided, uses settings.
#             base_url: Base URL for embedding API. If not provided, uses settings.
#             model: Embedding model to use. If not provided, uses settings.
#         """
#         try:
#             if api_key is None:
#                 api_key = settings.embedding_api_key
#             if base_url is None:
#                 base_url = settings.embedding_base_url
#             if model is None:
#                 model = settings.embedding_model

#             if not api_key:
#                 raise EmbeddingAuthError("Embedding API key is required")
#             if not model:
#                 raise EmbeddingServiceError("Embedding model is required")

#             logger.info(f"Initializing embedding service | model={model}")
#             self.client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
#             self.model = model
#         except EmbeddingServiceError:
#             raise
#         except Exception as e:
#             logger.exception("Failed to initialize embedding service")
#             raise EmbeddingServiceError(
#                 f"Failed to initialize embedding service: {e!s}"
#             ) from e

#     async def generate_embedding(self, text: str) -> list[float]:
#         """
#         Generate embedding for a single text.

#         Args:
#             text: Text to embed

#         Returns:
#             Embedding vector as list of floats
#         """
#         if not isinstance(text, str) or not text.strip():
#             raise EmbeddingServiceError("Text for embedding must be a non-empty string")

#         try:
#             response = await self.client.embeddings.create(
#                 model=self.model, input=text
#             )
#             if not response.data or not response.data[0].embedding:
#                 raise EmbeddingDataError("Embedding response contained no data")
#             return response.data[0].embedding
#         except openai.AuthenticationError as e:
#             logger.exception("Embedding auth error")
#             raise EmbeddingAuthError(f"Embedding auth error: {e!s}") from e
#         except openai.RateLimitError as e:
#             logger.exception("Embedding rate limit exceeded")
#             raise EmbeddingRateLimitError(
#                 f"Embedding rate limit exceeded: {e!s}"
#             ) from e
#         except openai.APITimeoutError as e:
#             logger.exception("Embedding request timed out")
#             raise EmbeddingTimeoutError(
#                 f"Embedding request timed out: {e!s}"
#             ) from e
#         except openai.APIConnectionError as e:
#             logger.exception("Embedding connection error")
#             raise EmbeddingNetworkError(
#                 f"Embedding connection error: {e!s}"
#             ) from e
#         except openai.APIError as e:
#             logger.exception("Embedding API error")
#             raise EmbeddingAPIError(
#                 f"Embedding API error: {e!s}"
#             ) from e
#         except EmbeddingServiceError:
#             raise
#         except Exception as e:
#             logger.exception("Failed to generate embedding")
#             raise EmbeddingServiceError(
#                 f"Failed to generate embedding: {e!s}"
#             ) from e


# # Singleton instance
# _embedding_service: EmbeddingService | None = None


# def get_embedding_service() -> EmbeddingService:
#     """
#     Get or create the embedding service singleton.

#     Returns:
#         EmbeddingService instance
#     """
#     global _embedding_service
#     if _embedding_service is None:
#         _embedding_service = EmbeddingService()
#     return _embedding_service
