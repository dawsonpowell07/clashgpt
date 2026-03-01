"""
Clerk JWT Authentication (via fastapi-clerk-auth)

Provides a pre-configured ClerkHTTPBearer guard and a FastAPI dependency
`get_current_user_id()` that extracts the Clerk user_id (sub) from the token.

Usage:
    from app.app_utils.clerk_auth import get_current_user_id

    @router.get("/protected")
    async def my_route(user_id: str = Depends(get_current_user_id)):
        ...
"""

import logging

from fastapi import Depends, HTTPException
from fastapi_clerk_auth import (
    ClerkConfig,
    ClerkHTTPBearer,
    HTTPAuthorizationCredentials,
)

from app.settings import settings

logger = logging.getLogger(__name__)

_clerk_config = ClerkConfig(jwks_url=settings.clerk_jwks_url)
clerk_auth_guard = ClerkHTTPBearer(config=_clerk_config, auto_error=True)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(clerk_auth_guard),  # noqa: B008
) -> str:
    """
    FastAPI dependency that validates a Clerk JWT and returns the user_id (sub claim).

    `auto_error=True` on the guard means invalid/missing tokens get a 403
    before this function is even reached.
    """
    if not credentials or not credentials.decoded:
        raise HTTPException(status_code=401, detail="Authentication required.")

    user_id: str = credentials.decoded.get("sub", "")
    if not user_id:
        logger.warning("Clerk token missing 'sub' claim")
        raise HTTPException(status_code=401, detail="Invalid token: missing user ID.")

    return user_id
