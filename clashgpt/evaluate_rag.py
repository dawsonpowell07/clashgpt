#!/usr/bin/env python3
"""
RAG Evaluation Script

Interactive CLI tool for evaluating RAG retrieval results.
Allows you to enter queries and see what documents are retrieved.
"""

import asyncio
import sys
from typing import Literal

from app.tools.rag_tool import (
    SearchResult,
    _hybrid_search,
    _semantic_search,
    _text_search,
)


def print_separator(char: str = "=", length: int = 80) -> None:
    """Print a separator line."""
    print(char * length)


def print_result(result: SearchResult, index: int) -> None:
    """Print a single search result in a formatted way."""
    print(f"\n{index}. {result.document_title}")
    print(f"   Similarity Score: {result.similarity:.4f}")
    print(f"   Source: {result.document_source}")
    print(f"   Document ID: {result.document_id}")
    print(f"   Chunk ID: {result.chunk_id}")

    # Print content with indentation
    print("\n   Content:")
    content_lines = result.content.split('\n')
    for line in content_lines:
        print(f"   {line}")

    # Print metadata if present
    if result.metadata:
        print(f"\n   Metadata: {result.metadata}")


async def evaluate_query(
    query: str,
    match_count: int = 5,
    search_type: Literal["hybrid", "semantic", "text"] = "hybrid",
) -> list[SearchResult]:
    """
    Evaluate a query and return results.

    Args:
        query: The search query
        match_count: Number of results to return
        search_type: Type of search to perform

    Returns:
        List of search results
    """
    print(f"\nExecuting {search_type.upper()} search...")
    print(f"Query: '{query}'")
    print(f"Requested results: {match_count}")
    print_separator("-")

    # Perform search based on type
    if search_type == "semantic":
        results = await _semantic_search(query, match_count)
    elif search_type == "text":
        results = await _text_search(query, match_count)
    else:  # hybrid
        results = await _hybrid_search(query, match_count)

    return results


async def interactive_mode() -> None:
    """Run the evaluation tool in interactive mode."""
    print_separator()
    print("RAG Evaluation Tool - Interactive Mode")
    print_separator()
    print("\nCommands:")
    print("  - Enter a query to search")
    print("  - Type 'quit' or 'exit' to stop")
    print("  - Type 'help' for options")
    print_separator()

    # Default settings
    match_count = 5
    search_type: Literal["hybrid", "semantic", "text"] = "hybrid"

    while True:
        try:
            # Get user input
            user_input = input("\n> ").strip()

            if not user_input:
                continue

            # Handle commands
            if user_input.lower() in ["quit", "exit", "q"]:
                print("\nExiting...")
                break

            if user_input.lower() == "help":
                print("\nOptions:")
                print("  /count <n>     - Set number of results (default: 5)")
                print(
                    "  /type <type>   - Set search type: hybrid, semantic, or text (default: hybrid)")
                print("  /settings      - Show current settings")
                print("  quit/exit      - Exit the tool")
                print("\nExample queries:")
                print("  What are Clash Royale chests?")
                print("  How do gems work?")
                print("  Tell me about cards")
                continue

            if user_input.lower().startswith("/count "):
                try:
                    match_count = int(user_input.split()[1])
                    print(f"✓ Result count set to {match_count}")
                except (ValueError, IndexError):
                    print("✗ Invalid count. Usage: /count <number>")
                continue

            if user_input.lower().startswith("/type "):
                try:
                    new_type = user_input.split()[1].lower()
                    if new_type in ["hybrid", "semantic", "text"]:
                        search_type = new_type  # type: ignore
                        print(f"✓ Search type set to {search_type}")
                    else:
                        print("✗ Invalid type. Use: hybrid, semantic, or text")
                except IndexError:
                    print("✗ Invalid type. Usage: /type <hybrid|semantic|text>")
                continue

            if user_input.lower() == "/settings":
                print("\nCurrent Settings:")
                print(f"  Search Type: {search_type}")
                print(f"  Result Count: {match_count}")
                continue

            # Execute search
            results = await evaluate_query(user_input, match_count, search_type)

            # Display results
            if not results:
                print("\n⚠️  No results found!")
            else:
                print(f"\n✓ Found {len(results)} results:\n")
                print_separator()

                for i, result in enumerate(results, 1):
                    print_result(result, i)
                    if i < len(results):
                        print_separator("-")

                print_separator()

                # Summary statistics
                avg_score = sum(r.similarity for r in results) / len(results)
                print("\nSummary:")
                print(f"  Results: {len(results)}")
                print(f"  Average Score: {avg_score:.4f}")
                print(f"  Top Score: {results[0].similarity:.4f}")
                print(f"  Lowest Score: {results[-1].similarity:.4f}")

        except KeyboardInterrupt:
            print("\n\nExiting...")
            break
        except Exception as e:
            print(f"\n✗ Error: {e}")
            import traceback
            traceback.print_exc()


async def single_query_mode(
    query: str,
    match_count: int = 5,
    search_type: Literal["hybrid", "semantic", "text"] = "hybrid",
) -> None:
    """Run a single query evaluation."""
    print_separator()
    print("RAG Evaluation Tool - Single Query Mode")
    print_separator()

    results = await evaluate_query(query, match_count, search_type)

    if not results:
        print("\n  No results found!")
        sys.exit(1)

    print(f"\n✓ Found {len(results)} results:\n")
    print_separator()

    for i, result in enumerate(results, 1):
        print_result(result, i)
        if i < len(results):
            print_separator("-")

    print_separator()

    # Summary statistics
    avg_score = sum(r.similarity for r in results) / len(results)
    print("\nSummary:")
    print(f"  Results: {len(results)}")
    print(f"  Average Score: {avg_score:.4f}")
    print(f"  Top Score: {results[0].similarity:.4f}")
    print(f"  Lowest Score: {results[-1].similarity:.4f}")


def main() -> None:
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Evaluate RAG retrieval results",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode
  python evaluate_rag.py

  # Single query
  python evaluate_rag.py -q "What are Clash Royale chests?"

  # Semantic search with more results
  python evaluate_rag.py -q "How do gems work?" -n 10 -t semantic
        """,
    )

    parser.add_argument(
        "-q", "--query",
        type=str,
        help="Query to evaluate (if not provided, enters interactive mode)",
    )
    parser.add_argument(
        "-n", "--count",
        type=int,
        default=5,
        help="Number of results to return (default: 5)",
    )
    parser.add_argument(
        "-t", "--type",
        type=str,
        choices=["hybrid", "semantic", "text"],
        default="hybrid",
        help="Search type (default: hybrid)",
    )

    args = parser.parse_args()

    # Run appropriate mode
    if args.query:
        asyncio.run(single_query_mode(args.query, args.count, args.type))
    else:
        asyncio.run(interactive_mode())


if __name__ == "__main__":
    main()
