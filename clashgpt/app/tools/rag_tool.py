"""
Knowledge base search tool for RAG Agent.

Provides hybrid search combining semantic (vector) and keyword (text) search
using MongoDB Atlas with Reciprocal Rank Fusion for result merging.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any
from pymongo.errors import OperationFailure

from app.services.embeddings import (
    EmbeddingAPIError,
    EmbeddingAuthError,
    EmbeddingDataError,
    EmbeddingNetworkError,
    EmbeddingRateLimitError,
    EmbeddingServiceError,
    EmbeddingTimeoutError,
    get_embedding_service,
)
from app.services.mongo_db import (
    MongoDBConnectionError,
    MongoDBServiceError,
    get_mongodb,
)
from app.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Model for search results."""

    chunk_id: str
    document_id: str
    content: str
    similarity: float
    metadata: dict[str, Any] = field(default_factory=dict)
    document_title: str = ""
    document_source: str = ""


async def _semantic_search(query: str, match_count: int) -> list[SearchResult]:
    """
    Perform pure semantic search using MongoDB vector similarity.

    Args:
        query: Search query text
        match_count: Number of results to return

    Returns:
        List of search results ordered by similarity
    """
    try:
        mongo_db = get_mongodb()
        embedding_service = get_embedding_service()

        # Generate embedding for query
        query_embedding = await embedding_service.generate_embedding(query)

        # Build MongoDB aggregation pipeline
        pipeline = [
            {
                "$vectorSearch": {
                    "index": settings.mongodb_vector_index,
                    "queryVector": query_embedding,
                    "path": "embedding",
                    "numCandidates": 100,
                    "limit": match_count,
                }
            },
            {
                "$lookup": {
                    "from": settings.mongodb_collection_documents,
                    "localField": "document_id",
                    "foreignField": "_id",
                    "as": "document_info",
                }
            },
            {"$unwind": "$document_info"},
            {
                "$project": {
                    "chunk_id": "$_id",
                    "document_id": 1,
                    "content": 1,
                    "similarity": {"$meta": "vectorSearchScore"},
                    "metadata": 1,
                    "document_title": "$document_info.title",
                    "document_source": "$document_info.source",
                }
            },
        ]

        # Execute aggregation
        collection = mongo_db.db[settings.mongodb_collection_chunks]
        cursor = await collection.aggregate(pipeline)
        # Aggregate returns an async cursor; collect up to match_count docs
        results = [doc async for doc in cursor][:match_count]

        # Convert to SearchResult objects
        search_results = [
            SearchResult(
                chunk_id=str(doc["chunk_id"]),
                document_id=str(doc["document_id"]),
                content=doc["content"],
                similarity=doc["similarity"],
                metadata=doc.get("metadata", {}),
                document_title=doc["document_title"],
                document_source=doc["document_source"],
            )
            for doc in results
        ]

        logger.info(
            f"semantic_search_completed: query={query}, results={len(search_results)}"
        )

        return search_results

    except (EmbeddingAuthError, EmbeddingRateLimitError, EmbeddingTimeoutError) as e:
        logger.error(
            f"semantic_search_failed: query={query}, embedding_error={e!s}"
        )
        return []
    except (EmbeddingNetworkError, EmbeddingAPIError, EmbeddingDataError) as e:
        logger.error(
            f"semantic_search_failed: query={query}, embedding_error={e!s}"
        )
        return []
    except (MongoDBConnectionError, MongoDBServiceError) as e:
        logger.error(
            f"semantic_search_failed: query={query}, mongo_error={e!s}"
        )
        return []
    except OperationFailure as e:
        error_code = e.code if hasattr(e, "code") else None
        logger.error(
            f"semantic_search_failed: query={query}, error={e!s}, code={error_code}")
        return []
    except Exception as e:
        logger.exception(f"semantic_search_error: query={query}, error={e!s}")
        return []


async def _text_search(query: str, match_count: int) -> list[SearchResult]:
    """
    Perform full-text search using MongoDB Atlas Search.

    Args:
        query: Search query text
        match_count: Number of results to return

    Returns:
        List of search results ordered by text relevance
    """
    try:
        mongo_db = get_mongodb()

        # Build MongoDB Atlas Search aggregation pipeline
        pipeline = [
            {
                "$search": {
                    "index": settings.mongodb_text_index,
                    "text": {
                        "query": query,
                        "path": "content",
                        "fuzzy": {"maxEdits": 2, "prefixLength": 3},
                    },
                }
            },
            {"$limit": match_count * 2},
            {
                "$lookup": {
                    "from": settings.mongodb_collection_documents,
                    "localField": "document_id",
                    "foreignField": "_id",
                    "as": "document_info",
                }
            },
            {"$unwind": "$document_info"},
            {
                "$project": {
                    "chunk_id": "$_id",
                    "document_id": 1,
                    "content": 1,
                    "similarity": {"$meta": "searchScore"},
                    "metadata": 1,
                    "document_title": "$document_info.title",
                    "document_source": "$document_info.source",
                }
            },
        ]

        # Execute aggregation
        collection = mongo_db.db[settings.mongodb_collection_chunks]
        cursor = await collection.aggregate(pipeline)
        results = [doc async for doc in cursor][:match_count * 2]

        # Convert to SearchResult objects
        search_results = [
            SearchResult(
                chunk_id=str(doc["chunk_id"]),
                document_id=str(doc["document_id"]),
                content=doc["content"],
                similarity=doc["similarity"],
                metadata=doc.get("metadata", {}),
                document_title=doc["document_title"],
                document_source=doc["document_source"],
            )
            for doc in results
        ]

        logger.info(
            f"text_search_completed: query={query}, results={len(search_results)}")

        return search_results

    except (MongoDBConnectionError, MongoDBServiceError) as e:
        logger.error(
            f"text_search_failed: query={query}, mongo_error={e!s}"
        )
        return []
    except OperationFailure as e:
        error_code = e.code if hasattr(e, "code") else None
        logger.error(
            f"text_search_failed: query={query}, error={e!s}, code={error_code}")
        return []
    except Exception as e:
        logger.exception(f"text_search_error: query={query}, error={e!s}")
        return []


def _reciprocal_rank_fusion(
    search_results_list: list[list[SearchResult]], k: int = 60
) -> list[SearchResult]:
    """
    Merge multiple ranked lists using Reciprocal Rank Fusion.

    RRF scores each document based on its rank position in each result list.

    Args:
        search_results_list: List of ranked result lists from different searches
        k: RRF constant (default: 60, standard in literature)

    Returns:
        Unified list of results sorted by combined RRF score
    """
    # Build score dictionary by chunk_id
    rrf_scores: dict[str, float] = {}
    chunk_map: dict[str, SearchResult] = {}

    # Process each search result list
    for results in search_results_list:
        for rank, result in enumerate(results):
            chunk_id = result.chunk_id

            # Calculate RRF contribution: 1 / (k + rank)
            rrf_score = 1.0 / (k + rank)

            # Accumulate score (automatic deduplication)
            if chunk_id in rrf_scores:
                rrf_scores[chunk_id] += rrf_score
            else:
                rrf_scores[chunk_id] = rrf_score
                chunk_map[chunk_id] = result

    # Sort by combined RRF score (descending)
    sorted_chunks = sorted(
        rrf_scores.items(), key=lambda x: x[1], reverse=True)

    # Build final result list with updated similarity scores
    merged_results = []
    for chunk_id, rrf_score in sorted_chunks:
        result = chunk_map[chunk_id]
        # Create new result with updated similarity (RRF score)
        merged_result = SearchResult(
            chunk_id=result.chunk_id,
            document_id=result.document_id,
            content=result.content,
            similarity=rrf_score,  # Combined RRF score
            metadata=result.metadata,
            document_title=result.document_title,
            document_source=result.document_source,
        )
        merged_results.append(merged_result)

    logger.info(
        f"RRF merged {len(search_results_list)} result lists into {len(merged_results)} unique results"
    )

    return merged_results


async def _hybrid_search(query: str, match_count: int) -> list[SearchResult]:
    """
    Perform hybrid search combining semantic and keyword matching.

    Args:
        query: Search query text
        match_count: Number of results to return

    Returns:
        List of search results sorted by combined RRF score
    """
    logger.info(
        f"_hybrid_search starting: query='{query}', match_count={match_count}")

    try:
        # Over-fetch for better RRF results (2x requested count)
        fetch_count = match_count * 2

        # Run both searches concurrently for performance
        results_tuple = await asyncio.gather(
            _semantic_search(query, fetch_count),
            _text_search(query, fetch_count),
            return_exceptions=True,  # Don't fail if one search errors
        )

        # Handle errors gracefully
        semantic_results, text_results = results_tuple
        semantic_list: list[SearchResult] = []
        text_list: list[SearchResult] = []

        if isinstance(semantic_results, Exception):
            logger.warning(
                f"Semantic search failed: {semantic_results!r}, using text results only"
            )
        elif isinstance(semantic_results, list):
            semantic_list = semantic_results

        if isinstance(text_results, Exception):
            logger.warning(
                f"Text search failed: {text_results!r}, using semantic results only"
            )
        elif isinstance(text_results, list):
            text_list = text_results

        # If both failed, return empty
        if not semantic_list and not text_list:
            logger.error("Both semantic and text search failed")
            return []

        # Merge results using Reciprocal Rank Fusion
        merged_results = _reciprocal_rank_fusion(
            [semantic_list, text_list], k=60  # Standard RRF constant
        )

        # Return top N results
        final_results = merged_results[:match_count]

        logger.info(
            f"_hybrid_search completed: query='{query}', "
            f"semantic={len(semantic_list)}, text={len(text_list)}, "
            f"merged={len(merged_results)}, returned={len(final_results)}"
        )

        return final_results

    except Exception as e:
        logger.exception(f"_hybrid_search error: query={query}, error={e!s}")
        return []


async def search_knowledge_base(
    query: str,
    match_count: int = 5,
    search_type: str = "hybrid",
) -> str:
    """
    Search the knowledge base for relevant information.

    This tool searches your knowledge base using semantic search (vector similarity),
    text search (keyword matching), or hybrid search (combination of both).

    Use this tool when users ask for information that would be in the knowledge base.
    DO NOT use this for greetings or general conversation.

    Args:
        query: The search query. Should be a natural language question or topic.

        match_count: Number of results to return (default: 5, max: 50).
            Use lower values (5-10) for focused results, higher (20-50) for comprehensive search.

        search_type: Type of search to perform (default: "hybrid").
            Options:
            - "hybrid": Combines semantic and text search (RECOMMENDED - best results)
            - "semantic": Vector similarity search only (good for conceptual queries)
            - "text": Keyword/fuzzy matching only (good for exact terms)

    Returns:
        Formatted string containing the retrieved information ready for the LLM to use.
        Includes document titles, relevance scores, and content.

    Examples:
        # Hybrid search for authentication (recommended)
        await search_knowledge_base(query="What are clash royal chests", match_count=10)

        # Semantic search for concepts
        await search_knowledge_base(
            query="best way to utilize gems effectively",
            match_count=5,
            search_type="semantic"
        )

        # Text search for specific terms
        await search_knowledge_base(
            query="Clash Royale Currencies",
            match_count=8,
            search_type="text"
        )
    """
    logger.info(
        f"Tool: search_knowledge_base | query='{query}', "
        f"match_count={match_count}, search_type={search_type}"
    )

    try:
        if not isinstance(query, str) or not query.strip():
            return (
                "Knowledge base search requires a non-empty query. "
                "Ask the user to clarify their question."
            )

        if not isinstance(match_count, int) or match_count <= 0:
            return (
                "Knowledge base search requires a positive match_count. "
                "Use a value between 1 and 50."
            )

        if search_type not in {"hybrid", "semantic", "text"}:
            return (
                "Unknown search_type. Use 'hybrid', 'semantic', or 'text'."
            )

        # Validate match count
        match_count = min(max(1, match_count), settings.max_match_count)

        # Perform the search based on type
        if search_type == "semantic":
            results = await _semantic_search(query, match_count)
        elif search_type == "text":
            results = await _text_search(query, match_count)
        else:  # hybrid (default)
            results = await _hybrid_search(query, match_count)

        # Format results as a string for the LLM
        if not results:
            return "No relevant information found in the knowledge base."

        # Build a formatted response
        response_parts = [f"Found {len(results)} relevant documents:\n"]

        for i, result in enumerate(results, 1):
            response_parts.append(
                f"\n--- Document {i}: {result.document_title} "
                f"(relevance: {result.similarity:.2f}) ---"
            )
            response_parts.append(result.content)
            if result.document_source:
                response_parts.append(f"Source: {result.document_source}")

        logger.info(
            f"search_knowledge_base completed: query='{query}', "
            f"returned {len(results)} results"
        )

        return "\n".join(response_parts)

    except (EmbeddingServiceError, MongoDBServiceError) as e:
        error_msg = f"Knowledge base services unavailable: {e!s}"
        logger.error(error_msg)
        return (
            "Knowledge base is temporarily unavailable due to a backend service issue. "
            "Please retry shortly or continue without KB context."
        )
    except Exception as e:
        error_msg = f"Error searching knowledge base: {e!s}"
        logger.exception(error_msg)
        return (
            "Knowledge base search failed unexpectedly. "
            "Please retry or continue without KB context."
        )
