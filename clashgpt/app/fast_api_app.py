# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import hmac
import logging
import time
from contextlib import asynccontextmanager

import google.auth
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from google.adk.apps import App, ResumabilityConfig
from google.cloud import logging as google_cloud_logging

# from slowapi import _rate_limit_exceeded_handler
# from slowapi.errors import RateLimitExceeded
# from slowapi.middleware import SlowAPIMiddleware
from app.agent import root_agent
from app.app_utils.telemetry import setup_telemetry
from app.cache import cache

# from app.rate_limit import limiter
from app.routers.deck_analysis import router as deck_analysis_router
from app.routers.decks import router as decks_router
from app.routers.global_tournament import router as global_tournament_router
from app.routers.profiles import router as profiles_router
from app.services.database import get_database_service
from app.settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

setup_telemetry()
_, project_id = google.auth.default()
logging_client = google_cloud_logging.Client()
logger = logging_client.logger(__name__)
app_logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan events.

    Initializes database connections on startup and closes them on shutdown.
    """
    # Startup: Initialize Redis cache
    cache.init(
        url=settings.upstash_redis_url,
        token=settings.upstash_redis_token,
    )

    # Startup: Initialize database connections
    db_service = get_database_service()
    logger.log_struct(
        {
            "event": "database_services_initialized",
            "postgres": True,
            "redis_cache": cache.enabled,
        },
        severity="INFO",
    )

    yield

    # Shutdown: Close database connections
    await db_service.close()
    logger.log_struct(
        {
            "event": "database_services_closed",
            "postgres": True,
        },
        severity="INFO",
    )


app = FastAPI()
app.title = "clashgpt"
app.description = "API for interacting with the Agent clashgpt"

# Rate limiting
# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# app.add_middleware(SlowAPIMiddleware)

# CORS middleware
if not settings.dev_mode and not settings.allow_origins:
    raise RuntimeError(
        "ALLOW_ORIGINS environment variable must be set in production. "
        "Example: ALLOW_ORIGINS=https://yourdomain.com,https://www.yourdomain.com"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins
    if isinstance(settings.allow_origins, list)
    else [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Override lifespan to manage database connections
app.router.lifespan_context = lifespan

# Include API routers
app.include_router(decks_router)
app.include_router(deck_analysis_router)
app.include_router(global_tournament_router)
app.include_router(profiles_router)


@app.middleware("http")
async def agent_api_key_middleware(request: Request, call_next):
    """Validate x-api-key for /agent requests."""
    if request.url.path.startswith("/agent"):
        api_key = request.headers.get("x-api-key")
        expected_key = settings.backend_api_key

        if not expected_key:
            app_logger.error("BACKEND_API_KEY is not set — rejecting request")
            from starlette.responses import JSONResponse

            return JSONResponse(
                status_code=500, content={"detail": "Server misconfiguration"}
            )

        if not hmac.compare_digest(api_key or "", expected_key):
            app_logger.warning("Rejected /agent request: invalid or missing API key")
            from starlette.responses import JSONResponse

            return JSONResponse(
                status_code=403,
                content={"detail": "Forbidden: invalid or missing API key"},
            )

    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    app_logger.info(
        f"API response: {request.method} {request.url.path} | "
        f"status={response.status_code} | duration={duration:.3f}s"
    )
    return response


@app.get("/health")
def health() -> dict[str, str]:
    """
    Health check endpoint for Cloud Run.
    """
    return {"status": "healthy"}


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

adk_app = App(
    name="clashgpt",
    root_agent=root_agent,
    resumability_config=ResumabilityConfig(is_resumable=True),
)

adk_agent = ADKAgent.from_app(
    adk_app,
    user_id_extractor=lambda input: input.state.get("headers", {}).get(
        "user_id", "user"
    ),
    session_timeout_seconds=1200,  # Session inactivity timeout (default: 20 min)
    execution_timeout_seconds=600,  # Max execution time (default: 10 min)
    tool_timeout_seconds=300,  # Tool execution timeout (default: 5 min)
    use_in_memory_services=True,
    # session_service=DatabaseSessionService(
    #     db_url="postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/clashroyale_db"
    # ),
)

add_adk_fastapi_endpoint(app, adk_agent, path="/agent", extract_headers=["x-user-id"])
