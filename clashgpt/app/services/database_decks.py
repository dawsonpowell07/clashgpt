# This file contains the new READ ONLY deck methods for database.py
# Copy these methods into database.py to replace the old deck section

    # ===== DECKS ENDPOINTS (READ ONLY) =====

    async def get_deck_by_id(self, deck_id: str) -> Deck | None:
        """
        Get a deck by its ID from the decks dimension table.

        Args:
            deck_id: The deck ID (plaintext composition: card_id_variant|card_id_variant|...)

        Returns:
            Deck object or None if not found
        """
        logger.info(f"DB query: get_deck_by_id | deck_id={deck_id}")
        try:
            async with self.async_session() as session:
                stmt = text("""
                    SELECT deck_id, avg_elixir
                    FROM decks
                    WHERE deck_id = :deck_id
                """)
                result = await session.execute(stmt, {"deck_id": deck_id})
                row = result.fetchone()

                if row:
                    return Deck(deck_id=row[0], avg_elixir=float(row[1]))
                return None
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_deck_by_id")
            raise DatabaseQueryError(
                f"Database query failed while fetching deck: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_deck_by_id")
            raise DatabaseServiceError(
                f"Unexpected error while fetching deck: {e!s}"
            ) from e

    async def get_deck_with_cards(self, deck_id: str) -> DeckWithStats | None:
        """
        Get a deck with its cards from deck_cards bridge table.

        Args:
            deck_id: The deck ID

        Returns:
            DeckWithStats with cards populated, or None if not found
        """
        logger.info(f"DB query: get_deck_with_cards | deck_id={deck_id}")
        try:
            async with self.async_session() as session:
                # First get the deck
                deck_stmt = text("SELECT deck_id, avg_elixir FROM decks WHERE deck_id = :deck_id")
                deck_result = await session.execute(deck_stmt, {"deck_id": deck_id})
                deck_row = deck_result.fetchone()

                if not deck_row:
                    return None

                # Get the cards for this deck
                cards_stmt = text("""
                    SELECT dc.deck_id, dc.card_id, dc.evolution_level, dc.is_support_card,
                           c.name, c.elixir_cost, c.rarity
                    FROM deck_cards dc
                    LEFT JOIN cards c ON dc.card_id = c.card_id
                    WHERE dc.deck_id = :deck_id
                    ORDER BY c.name
                """)
                cards_result = await session.execute(cards_stmt, {"deck_id": deck_id})
                cards_rows = cards_result.fetchall()

                from app.models.models import DeckCards
                deck_cards = []
                for card_row in cards_rows:
                    deck_card = DeckCards(
                        deck_id=card_row[0],
                        card_id=card_row[1],
                        evolution_level=card_row[2],
                        is_support_card=card_row[3]
                    )
                    deck_cards.append(deck_card)

                return DeckWithStats(
                    deck_id=deck_row[0],
                    avg_elixir=float(deck_row[1]),
                    cards=deck_cards
                )
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_deck_with_cards")
            raise DatabaseQueryError(
                f"Database query failed while fetching deck with cards: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_deck_with_cards")
            raise DatabaseServiceError(
                f"Unexpected error while fetching deck with cards: {e!s}"
            ) from e

    # ===== DECK ANALYTICS (READ ONLY) =====

    async def get_deck_stats(
        self,
        deck_id: str,
        season_id: int | None = None,
        league: str | None = None
    ) -> DeckStats | None:
        """
        Get statistics for a deck aggregated from deck_usage_facts.

        Args:
            deck_id: The deck ID
            season_id: Optional season filter
            league: Optional league filter

        Returns:
            DeckStats object with aggregated statistics, or None if deck not found
        """
        logger.info(
            f"DB query: get_deck_stats | deck_id={deck_id}, season_id={season_id}, league={league}"
        )
        try:
            async with self.async_session() as session:
                # Build WHERE clause
                where_conditions = ["duf.deck_id = :deck_id"]
                params: dict[str, Any] = {"deck_id": deck_id}

                if season_id:
                    where_conditions.append("duf.season_id = :season_id")
                    params["season_id"] = season_id

                if league:
                    where_conditions.append("duf.league = :league")
                    params["league"] = league

                where_clause = "WHERE " + " AND ".join(where_conditions)

                query = f"""
                    SELECT
                        duf.deck_id,
                        COUNT(*) AS games_played,
                        SUM(CASE WHEN duf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                        SUM(CASE WHEN duf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses
                    FROM deck_usage_facts duf
                    {where_clause}
                    GROUP BY duf.deck_id
                """

                result = await session.execute(text(query), params)
                row = result.fetchone()

                if row:
                    games = row[1]
                    wins = row[2]
                    win_rate = (wins / games) if games > 0 else None

                    return DeckStats(
                        deck_id=row[0],
                        games_played=games,
                        wins=wins,
                        losses=row[3],
                        win_rate=win_rate
                    )
                return None
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_deck_stats")
            raise DatabaseQueryError(
                f"Database query failed while fetching deck stats: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_deck_stats")
            raise DatabaseServiceError(
                f"Unexpected error while fetching deck stats: {e!s}"
            ) from e

    async def get_top_decks_by_win_rate(
        self,
        season_id: int | None = None,
        league: str | None = None,
        min_games: int = 50,
        limit: int = 50
    ) -> list[DeckWithStats]:
        """
        Get top decks by win rate from deck_usage_facts.

        Args:
            season_id: Optional season filter
            league: Optional league filter
            min_games: Minimum number of games to include (default: 50)
            limit: Maximum number of results (default: 50)

        Returns:
            List of DeckWithStats ordered by win_rate descending
        """
        logger.info(
            f"DB query: get_top_decks_by_win_rate | season_id={season_id}, league={league}, "
            f"min_games={min_games}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                # Build WHERE clause
                where_conditions = []
                params: dict[str, Any] = {"min_games": min_games, "limit": limit}

                if season_id:
                    where_conditions.append("duf.season_id = :season_id")
                    params["season_id"] = season_id

                if league:
                    where_conditions.append("duf.league = :league")
                    params["league"] = league

                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

                query = f"""
                    SELECT
                        duf.deck_id,
                        d.avg_elixir,
                        COUNT(*) AS games_played,
                        SUM(CASE WHEN duf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                        SUM(CASE WHEN duf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
                        MAX(duf.battle_time) AS last_seen
                    FROM deck_usage_facts duf
                    JOIN decks d ON duf.deck_id = d.deck_id
                    {where_clause}
                    GROUP BY duf.deck_id, d.avg_elixir
                    HAVING COUNT(*) >= :min_games
                    ORDER BY CAST(SUM(CASE WHEN duf.result = 'WIN' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) DESC
                    LIMIT :limit
                """

                result = await session.execute(text(query), params)
                rows = result.fetchall()

                decks = []
                for row in rows:
                    games = row[2]
                    wins = row[3]
                    win_rate = (wins / games) if games > 0 else None

                    deck = DeckWithStats(
                        deck_id=row[0],
                        avg_elixir=float(row[1]),
                        games_played=games,
                        wins=wins,
                        losses=row[4],
                        win_rate=win_rate,
                        last_seen=row[5]
                    )
                    decks.append(deck)

                logger.info(f"DB result: get_top_decks_by_win_rate returned {len(decks)} decks")
                return decks
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_top_decks_by_win_rate")
            raise DatabaseQueryError(
                f"Database query failed while fetching top decks by win rate: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_top_decks_by_win_rate")
            raise DatabaseServiceError(
                f"Unexpected error while fetching top decks by win rate: {e!s}"
            ) from e

    async def get_top_decks_by_games_played(
        self,
        season_id: int | None = None,
        league: str | None = None,
        limit: int = 50
    ) -> list[DeckWithStats]:
        """
        Get most played decks from deck_usage_facts.

        Args:
            season_id: Optional season filter
            league: Optional league filter
            limit: Maximum number of results (default: 50)

        Returns:
            List of DeckWithStats ordered by games_played descending
        """
        logger.info(
            f"DB query: get_top_decks_by_games_played | season_id={season_id}, league={league}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                # Build WHERE clause
                where_conditions = []
                params: dict[str, Any] = {"limit": limit}

                if season_id:
                    where_conditions.append("duf.season_id = :season_id")
                    params["season_id"] = season_id

                if league:
                    where_conditions.append("duf.league = :league")
                    params["league"] = league

                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

                query = f"""
                    SELECT
                        duf.deck_id,
                        d.avg_elixir,
                        COUNT(*) AS games_played,
                        SUM(CASE WHEN duf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                        SUM(CASE WHEN duf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
                        MAX(duf.battle_time) AS last_seen
                    FROM deck_usage_facts duf
                    JOIN decks d ON duf.deck_id = d.deck_id
                    {where_clause}
                    GROUP BY duf.deck_id, d.avg_elixir
                    ORDER BY games_played DESC
                    LIMIT :limit
                """

                result = await session.execute(text(query), params)
                rows = result.fetchall()

                decks = []
                for row in rows:
                    games = row[2]
                    wins = row[3]
                    win_rate = (wins / games) if games > 0 else None

                    deck = DeckWithStats(
                        deck_id=row[0],
                        avg_elixir=float(row[1]),
                        games_played=games,
                        wins=wins,
                        losses=row[4],
                        win_rate=win_rate,
                        last_seen=row[5]
                    )
                    decks.append(deck)

                logger.info(f"DB result: get_top_decks_by_games_played returned {len(decks)} decks")
                return decks
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: get_top_decks_by_games_played")
            raise DatabaseQueryError(
                f"Database query failed while fetching top decks by games played: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in get_top_decks_by_games_played")
            raise DatabaseServiceError(
                f"Unexpected error while fetching top decks by games played: {e!s}"
            ) from e

    async def search_decks_by_cards(
        self,
        include_card_ids: list[int] | None = None,
        exclude_card_ids: list[int] | None = None,
        season_id: int | None = None,
        league: str | None = None,
        min_games: int = 0,
        sort_by: DeckSortBy = DeckSortBy.GAMES_PLAYED,
        limit: int = 50
    ) -> list[DeckWithStats]:
        """
        Search for decks containing/excluding specific cards using deck_cards bridge table.

        Args:
            include_card_ids: List of card IDs that must be in the deck
            exclude_card_ids: List of card IDs that must not be in the deck
            season_id: Optional season filter for stats
            league: Optional league filter for stats
            min_games: Minimum number of games (default: 0)
            sort_by: How to sort results (default: GAMES_PLAYED)
            limit: Maximum number of results (default: 50)

        Returns:
            List of DeckWithStats matching the filters
        """
        logger.info(
            f"DB query: search_decks_by_cards | include={include_card_ids}, exclude={exclude_card_ids}, "
            f"season_id={season_id}, league={league}, min_games={min_games}, sort_by={sort_by.value}, limit={limit}"
        )
        try:
            async with self.async_session() as session:
                # Build deck filter conditions
                deck_conditions = []
                params: dict[str, Any] = {"limit": limit}

                # Filter by included cards
                if include_card_ids:
                    for i, card_id in enumerate(include_card_ids):
                        deck_conditions.append(
                            f"EXISTS (SELECT 1 FROM deck_cards WHERE deck_id = d.deck_id AND card_id = :include_{i})"
                        )
                        params[f"include_{i}"] = card_id

                # Filter by excluded cards
                if exclude_card_ids:
                    for i, card_id in enumerate(exclude_card_ids):
                        deck_conditions.append(
                            f"NOT EXISTS (SELECT 1 FROM deck_cards WHERE deck_id = d.deck_id AND card_id = :exclude_{i})"
                        )
                        params[f"exclude_{i}"] = card_id

                deck_where = "WHERE " + " AND ".join(deck_conditions) if deck_conditions else ""

                # Build stats filter conditions
                stats_conditions = []
                if season_id:
                    stats_conditions.append("duf.season_id = :season_id")
                    params["season_id"] = season_id

                if league:
                    stats_conditions.append("duf.league = :league")
                    params["league"] = league

                stats_where = "WHERE " + " AND ".join(stats_conditions) if stats_conditions else ""

                # Build ORDER BY clause
                if sort_by == DeckSortBy.WIN_RATE:
                    order_clause = "ORDER BY CASE WHEN games_played > 0 THEN CAST(wins AS FLOAT) / games_played ELSE 0 END DESC"
                elif sort_by == DeckSortBy.WINS:
                    order_clause = "ORDER BY wins DESC"
                elif sort_by == DeckSortBy.RECENT:
                    order_clause = "ORDER BY last_seen DESC NULLS LAST"
                else:  # GAMES_PLAYED
                    order_clause = "ORDER BY games_played DESC"

                # Main query joining decks with aggregated stats
                query = f"""
                    WITH deck_stats_agg AS (
                        SELECT
                            duf.deck_id,
                            COUNT(*) AS games_played,
                            SUM(CASE WHEN duf.result = 'WIN' THEN 1 ELSE 0 END) AS wins,
                            SUM(CASE WHEN duf.result = 'LOSS' THEN 1 ELSE 0 END) AS losses,
                            MAX(duf.battle_time) AS last_seen
                        FROM deck_usage_facts duf
                        {stats_where}
                        GROUP BY duf.deck_id
                    )
                    SELECT
                        d.deck_id,
                        d.avg_elixir,
                        COALESCE(dsa.games_played, 0) AS games_played,
                        COALESCE(dsa.wins, 0) AS wins,
                        COALESCE(dsa.losses, 0) AS losses,
                        dsa.last_seen
                    FROM decks d
                    LEFT JOIN deck_stats_agg dsa ON d.deck_id = dsa.deck_id
                    {deck_where}
                    HAVING COALESCE(dsa.games_played, 0) >= :min_games
                    {order_clause}
                    LIMIT :limit
                """
                params["min_games"] = min_games

                result = await session.execute(text(query), params)
                rows = result.fetchall()

                decks = []
                for row in rows:
                    games = row[2]
                    wins = row[3]
                    win_rate = (wins / games) if games > 0 else None

                    deck = DeckWithStats(
                        deck_id=row[0],
                        avg_elixir=float(row[1]),
                        games_played=games,
                        wins=wins,
                        losses=row[4],
                        win_rate=win_rate,
                        last_seen=row[5]
                    )
                    decks.append(deck)

                logger.info(f"DB result: search_decks_by_cards returned {len(decks)} decks")
                return decks
        except DatabaseServiceError:
            raise
        except SQLAlchemyError as e:
            logger.exception("DB query failed: search_decks_by_cards")
            raise DatabaseQueryError(
                f"Database query failed while searching decks by cards: {e!s}"
            ) from e
        except Exception as e:
            logger.exception("Unexpected error in search_decks_by_cards")
            raise DatabaseServiceError(
                f"Unexpected error while searching decks by cards: {e!s}"
            ) from e
