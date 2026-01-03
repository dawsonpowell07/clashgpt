"""
Script to download all Clash Royale card images from the API.

Downloads card images from the /cards endpoint and organizes them into folders:
- cards/<card_name>/<card_name>.png (base image)
- cards/<card_name>/<card_name>_hero.png (if heroMedium exists)
- cards/<card_name>/<card_name>_evolution.png (if evolutionMedium exists)
"""

import asyncio
from pathlib import Path

import httpx


API_BASE_URL = "http://localhost:8000"
OUTPUT_DIR = Path("cards")


def sanitize_filename(name: str) -> str:
    """Sanitize card name for use as folder/file name."""
    return name.lower().replace(" ", "_").replace("-", "_").replace(".", "")


async def download_image(client: httpx.AsyncClient, url: str, filepath: Path) -> None:
    """Download an image from URL and save to filepath."""
    try:
        response = await client.get(url)
        response.raise_for_status()
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_bytes(response.content)
        print(f"Downloaded: {filepath}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")


async def download_card_images(card: dict, client: httpx.AsyncClient) -> None:
    """Download all images for a single card."""
    card_name = sanitize_filename(card["name"])
    card_folder = OUTPUT_DIR / card_name
    icon_urls = card.get("icon_urls", {})

    tasks = []

    # Download base medium image
    if "medium" in icon_urls:
        filepath = card_folder / f"{card_name}.png"
        tasks.append(download_image(client, icon_urls["medium"], filepath))

    # Download hero variant if available
    if "heroMedium" in icon_urls:
        filepath = card_folder / f"{card_name}_hero.png"
        tasks.append(download_image(client, icon_urls["heroMedium"], filepath))

    # Download evolution variant if available
    if "evolutionMedium" in icon_urls:
        filepath = card_folder / f"{card_name}_evolution.png"
        tasks.append(download_image(client, icon_urls["evolutionMedium"], filepath))

    await asyncio.gather(*tasks)


async def main() -> None:
    """Main function to fetch cards and download all images."""
    print("Fetching cards from API...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Fetch all cards
        response = await client.get(f"{API_BASE_URL}/api/cards")
        response.raise_for_status()
        data = response.json()
        cards = data.get("cards", [])

        print(f"Found {len(cards)} cards. Starting download...")

        # Download images for all cards
        tasks = [download_card_images(card, client) for card in cards]
        await asyncio.gather(*tasks)

    print(f"\nDownload complete! Images saved to {OUTPUT_DIR.absolute()}")


if __name__ == "__main__":
    asyncio.run(main())
