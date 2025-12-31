"""
MongoDB Service

Async service for interacting with the MongoDB database.
Provides access to the vector database for agent queries.
"""
import logging

from pymongo import AsyncMongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.settings import settings

logger = logging.getLogger(__name__)


class MongoDBService:
    """
    Async service for querying MongoDB.

    Provides connection to the MongoDB vector database.
    """

    def __init__(
        self, mongodb_uri: str | None = None, mongodb_database: str | None = None
    ):
        """
        Initialize the MongoDB service.

        Args:
            mongodb_uri: MongoDB connection URI. If not provided, will use settings.
            mongodb_database: MongoDB database name. If not provided, will use settings.
        """
        if mongodb_uri is None:
            mongodb_uri = settings.mongodb_uri
        if mongodb_database is None:
            mongodb_database = settings.mongodb_database

        try:
            logger.info(f"Initializing MongoDB service | database={mongodb_database}")
            self.client = AsyncMongoClient(mongodb_uri)
            self.db = self.client[mongodb_database]
            logger.info("MongoDB connection established")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.exception("MongoDB connection failed")
            raise

    async def close(self):
        """Close MongoDB connections."""
        logger.info("Closing MongoDB connection")
        await self.client.close()


# Singleton instance
_mongodb_service: MongoDBService | None = None


def get_mongodb() -> MongoDBService:
    """
    Get or create the MongoDB service singleton.

    Returns:
        MongoDBService instance
    """
    global _mongodb_service
    if _mongodb_service is None:
        _mongodb_service = MongoDBService()
    return _mongodb_service
