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

import logging
import os
import time
from contextlib import asynccontextmanager
from urllib.parse import quote

import google.auth
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from google.adk.artifacts.gcs_artifact_service import GcsArtifactService
from google.adk.sessions.database_session_service import DatabaseSessionService
from google.cloud import logging as google_cloud_logging

from app.agent import root_agent
from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback
from app.tools.serialization import serialize_dataclass
from app.rate_limit import limiter
from app.routers.api import router as api_router
from app.services.database import get_database_service
# from app.services.mongo_db import get_mongodb
from app.settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

setup_telemetry()
_, project_id = google.auth.default()
logging_client = google_cloud_logging.Client()
logger = logging_client.logger(__name__)
app_logger = logging.getLogger(__name__)
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(
        ",") if os.getenv("ALLOW_ORIGINS") else None
)
is_cloud_run = os.getenv("K_SERVICE") is not None

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

session_service_uri = None

# DEV_MODE: Use all local database (no password required)
if settings.dev_mode:
    session_service_uri = (
        f"postgresql+asyncpg://{settings.local_db_user}@{settings.local_db_host}:{settings.local_db_port}/{settings.local_db_name}"
    )
else:
    # Cloud SQL session configuration
    if settings.prod_db_password:
        encoded_user = quote(settings.prod_db_user, safe="")
        encoded_pass = quote(settings.prod_db_password, safe="")

        # If on Cloud Run AND we have a connection name, use Unix Socket
        if is_cloud_run and settings.connection_name:
            session_service_uri = (
                f"postgresql+asyncpg://{encoded_user}:{encoded_pass}@"
                f"/{settings.prod_db_name}"
                # asyncpg often prefers the raw string or the dir
                f"?host=/cloudsql/{settings.connection_name}"
            )
        else:
            # Local development: Use TCP via Proxy on 127.0.0.1
            # This block will execute on your Mac
            session_service_uri = (
                f"postgresql+asyncpg://{encoded_user}:{encoded_pass}@"
                f"{settings.prod_db_host}:{settings.prod_db_port}/{settings.prod_db_name}"
            )

artifact_service_uri = f"gs://{settings.logs_bucket_name}" if settings.logs_bucket_name else None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan events.

    Initializes database connections on startup and closes them on shutdown.
    """
    # Startup: Initialize database connections
    db_service = get_database_service()
    # mongo_service = get_mongodb()
    logger.log_struct({
        "event": "database_services_initialized",
        "postgres": True,
        "mongodb": True
    }, severity="INFO")

    yield

    # Shutdown: Close database connections
    await db_service.close()
    # await mongo_service.close()
    logger.log_struct({
        "event": "database_services_closed",
        "postgres": True,
        "mongodb": True
    }, severity="INFO")


# app: FastAPI = get_fast_api_app(
#     agents_dir=AGENT_DIR,
#     web=True,
#     allow_origins=allow_origins,
#     session_service_uri=session_service_uri,
#     artifact_service_uri=artifact_service_uri,
#     otel_to_cloud=True,
# )
app = FastAPI()
app.title = "clashgpt"
app.description = "API for interacting with the Agent clashgpt"

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Add CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ] if settings.dev_mode else (allow_origins or ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Override lifespan to manage MongoDB connections
app.router.lifespan_context = lifespan

# Include API router
app.include_router(api_router)


# API request/response logging middleware + API key protection
PROTECTED_PATHS = {"/agent", "/feedback"}


@app.middleware("http")
async def log_and_protect_requests(request: Request, call_next):
    """Log incoming API requests and validate API key for protected routes."""
    start_time = time.time()

    # Log request
    app_logger.info(f"API request: {request.method} {request.url.path}")

    # API key validation for protected paths
    if any(request.url.path.startswith(p) for p in PROTECTED_PATHS):
        api_key = request.headers.get("x-api-key")
        expected_key = settings.backend_api_key

        # In dev mode, skip check if no key is configured
        if expected_key and api_key != expected_key:
            app_logger.warning(
                f"Rejected request to {request.url.path}: invalid or missing API key"
            )
            from starlette.responses import JSONResponse
            return JSONResponse(
                status_code=403,
                content={"detail": "Forbidden: invalid or missing API key"},
            )

    # Process request
    response = await call_next(request)

    # Log response
    duration = time.time() - start_time
    app_logger.info(
        f"API response: {request.method} {request.url.path} | "
        f"status={response.status_code} | duration={duration:.3f}s"
    )

    return response


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    logger.log_struct(serialize_dataclass(feedback), severity="INFO")
    return {"status": "success"}


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

session_service = DatabaseSessionService(db_url=session_service_uri)
adk_agent = ADKAgent(
    adk_agent=root_agent,
    app_name="clash_gpt",
    user_id_extractor=lambda input: input.state.get(
        "headers", {}).get("user_id", "user"),
    session_timeout_seconds=3600,
    use_in_memory_services=False,
    session_service=session_service,
    
)

add_adk_fastapi_endpoint(app, adk_agent, path="/agent", extract_headers=["x-user-id"]
                         )
