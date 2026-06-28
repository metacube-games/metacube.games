"""Admin REST endpoints — async MySQL access via an aiomysql pool.

These endpoints power the DatabaseAdmin tab in the controller frontend.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

import aiomysql
from fastapi import APIRouter, HTTPException, Query, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin")


def _config() -> dict:
    return {
        "host": os.getenv("MYSQL_HOST", "users-db"),
        "user": os.getenv("MYSQL_USER", "metacube"),
        "password": os.getenv("MYSQL_PASSWORD", "metacube"),
        "db": os.getenv("MYSQL_DATABASE", "metacube"),
        "autocommit": True,
    }


class LazyPool:
    """Connects to MySQL on first use instead of at startup so the controller
    boots even when users-db isn't running yet (common in local-dev)."""

    def __init__(self):
        self._pool: aiomysql.Pool | None = None
        self._lock = asyncio.Lock()

    async def get(self) -> aiomysql.Pool:
        if self._pool is not None:
            return self._pool
        async with self._lock:
            if self._pool is None:
                self._pool = await aiomysql.create_pool(
                    minsize=1, maxsize=8, **_config()
                )
        return self._pool

    async def close(self):
        if self._pool is not None:
            self._pool.close()
            await self._pool.wait_closed()
            self._pool = None


def create_pool() -> LazyPool:
    return LazyPool()


@asynccontextmanager
async def _cursor(req: Request) -> AsyncIterator[aiomysql.DictCursor]:
    pool = await req.app.state.db_pool.get()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            yield cursor


PLAYER_FIELDS = (
    "publicKey, username, coins, hp, banned, skinId, "
    "damageLevel, multiplierLevel, healthLevel, "
    "attackRangeLevel, flyLevel, criticalHitLevel, "
    "rewardAddress, suspendedUntil"
)


@router.get("/players")
async def get_players(
    req: Request,
    search: str = Query(""),
    limit: int = Query(50),
    offset: int = Query(0),
):
    try:
        async with _cursor(req) as cursor:
            if search:
                like = f"%{search}%"
                await cursor.execute(
                    f"SELECT {PLAYER_FIELDS} FROM Players "
                    "WHERE username LIKE %s OR publicKey LIKE %s "
                    "ORDER BY username LIMIT %s OFFSET %s",
                    (like, like, limit, offset),
                )
                players = await cursor.fetchall()
                await cursor.execute(
                    "SELECT COUNT(*) AS count FROM Players "
                    "WHERE username LIKE %s OR publicKey LIKE %s",
                    (like, like),
                )
            else:
                await cursor.execute(
                    f"SELECT {PLAYER_FIELDS} FROM Players "
                    "ORDER BY username LIMIT %s OFFSET %s",
                    (limit, offset),
                )
                players = await cursor.fetchall()
                await cursor.execute("SELECT COUNT(*) AS count FROM Players")

            total = (await cursor.fetchone())["count"]

        return {
            "players": players,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.exception("Error getting players")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/player/{public_key}")
async def get_player(public_key: str, req: Request):
    try:
        async with _cursor(req) as cursor:
            await cursor.execute(
                f"SELECT {PLAYER_FIELDS}, statistics, name, email "
                "FROM Players WHERE publicKey = %s",
                (public_key,),
            )
            player = await cursor.fetchone()
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        return {"player": player}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error getting player %s", public_key)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/player/{public_key}/coins")
async def update_player_coins(public_key: str, req: Request):
    try:
        body = await req.json()
        delta = body.get("coins", 0)
        async with _cursor(req) as cursor:
            await cursor.execute(
                "UPDATE Players SET coins = coins + %s WHERE publicKey = %s",
                (delta, public_key),
            )
            await cursor.execute(
                "SELECT coins FROM Players WHERE publicKey = %s",
                (public_key,),
            )
            row = await cursor.fetchone()
            new_coins = row["coins"] if row else 0
        return {"success": True, "coins_change": delta, "new_coins": new_coins}
    except Exception as e:
        logger.exception("Error updating coins for %s", public_key)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/player/{public_key}/ban")
async def ban_player(public_key: str, req: Request):
    try:
        body = await req.json()
        banned = bool(body.get("banned", True))
        async with _cursor(req) as cursor:
            await cursor.execute(
                "UPDATE Players SET banned = %s WHERE publicKey = %s",
                (1 if banned else 0, public_key),
            )
        return {"success": True, "banned": banned}
    except Exception as e:
        logger.exception("Error banning player %s", public_key)
        raise HTTPException(status_code=500, detail=str(e))


UPDATABLE_FIELDS = (
    "username",
    "hp",
    "coins",
    "skinId",
    "damageLevel",
    "multiplierLevel",
    "healthLevel",
    "attackRangeLevel",
    "flyLevel",
    "criticalHitLevel",
)


@router.post("/player/{public_key}/update")
async def update_player(public_key: str, req: Request):
    try:
        body = await req.json()
        assignments = []
        values: list = []
        for field in UPDATABLE_FIELDS:
            if field in body:
                assignments.append(f"{field} = %s")
                values.append(body[field])
        if not assignments:
            raise HTTPException(status_code=400, detail="No fields to update")
        values.append(public_key)
        async with _cursor(req) as cursor:
            await cursor.execute(
                f"UPDATE Players SET {', '.join(assignments)} "
                "WHERE publicKey = %s",
                values,
            )
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error updating player %s", public_key)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/player/{public_key}/delete")
async def delete_player(public_key: str, req: Request):
    try:
        async with _cursor(req) as cursor:
            await cursor.execute(
                "DELETE FROM Players WHERE publicKey = %s", (public_key,)
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Player not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error deleting player %s", public_key)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/player/{public_key}/reset-stats")
async def reset_player_stats(public_key: str, req: Request):
    try:
        async with _cursor(req) as cursor:
            await cursor.execute(
                "UPDATE Players SET statistics = %s WHERE publicKey = %s",
                ("{}", public_key),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Player not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error resetting stats for %s", public_key)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/player/{public_key}/reset-levels")
async def reset_player_levels(public_key: str, req: Request):
    try:
        async with _cursor(req) as cursor:
            await cursor.execute(
                "UPDATE Players SET "
                "damageLevel = 1, multiplierLevel = 1, healthLevel = 1, "
                "attackRangeLevel = 1, flyLevel = 1, criticalHitLevel = 1 "
                "WHERE publicKey = %s",
                (public_key,),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Player not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error resetting levels for %s", public_key)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_admin_stats(req: Request):
    try:
        async with _cursor(req) as cursor:
            await cursor.execute("SELECT COUNT(*) AS count FROM Players")
            total_players = (await cursor.fetchone())["count"]

            await cursor.execute("SELECT SUM(coins) AS total FROM Players")
            total_coins = (await cursor.fetchone())["total"] or 0

            await cursor.execute(
                "SELECT COUNT(*) AS count FROM Players WHERE banned = 1"
            )
            banned_players = (await cursor.fetchone())["count"]

            await cursor.execute(
                "SELECT publicKey, username, coins FROM Players "
                "ORDER BY coins DESC LIMIT 10"
            )
            top_players = await cursor.fetchall()

        return {
            "total_players": int(total_players),
            "total_coins": int(total_coins),
            "banned_players": int(banned_players),
            "top_players": top_players,
        }
    except Exception as e:
        logger.exception("Error getting admin stats")
        raise HTTPException(status_code=500, detail=str(e))
