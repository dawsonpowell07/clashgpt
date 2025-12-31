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

import os
from urllib.parse import quote

import google.auth
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app
from google.cloud import logging as google_cloud_logging

from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback
from app.routers.api import router as api_router

setup_telemetry()
_, project_id = google.auth.default()
logging_client = google_cloud_logging.Client()
logger = logging_client.logger(__name__)
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(
        ",") if os.getenv("ALLOW_ORIGINS") else None
)
is_cloud_run = os.getenv("K_SERVICE") is not None
dev_mode = os.environ.get("DEV_MODE", "false").lower() == "true"
# Artifact bucket for ADK (created by Terraform, passed via env var)
logs_bucket_name = os.environ.get("LOGS_BUCKET_NAME")

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

session_service_uri = None

# DEV_MODE: Use all local database (no password required)
if dev_mode:
    db_user = os.environ.get("LOCAL_DB_USER", "postgres")
    db_name = os.environ.get("LOCAL_DB_NAME", "postgres")
    db_host = os.environ.get("LOCAL_DB_HOST", "localhost")
    db_port = os.environ.get("LOCAL_DB_PORT", "5432")

    session_service_uri = (
        f"postgresql+asyncpg://{db_user}@{db_host}:{db_port}/{db_name}"
    )
else:
    # Cloud SQL session configuration
    db_user = os.environ.get("PROD_DB_USER", "postgres")
    db_name = os.environ.get("PROD_DB_NAME", "postgres")
    db_pass = os.environ.get("PROD_DB_PASSWORD")
    db_host = os.environ.get("PROD_DB_HOST", "localhost")
    db_port = os.environ.get("PROD_DB_PORT", "5432")
    instance_connection_name = os.environ.get("CONNECTION_NAME")

    if db_pass:
        encoded_user = quote(db_user, safe="")
        encoded_pass = quote(db_pass, safe="")

        # If on Cloud Run AND we have a connection name, use Unix Socket
        if is_cloud_run and instance_connection_name:
            encoded_instance = instance_connection_name.replace(":", "%3A")
            session_service_uri = (
                f"postgresql+asyncpg://{encoded_user}:{encoded_pass}@"
                f"/{db_name}"
                # asyncpg often prefers the raw string or the dir
                f"?host=/cloudsql/{instance_connection_name}"
            )
        else:
            # Local development: Use TCP via Proxy on 127.0.0.1
            # This block will execute on your Mac
            session_service_uri = (
                f"postgresql+asyncpg://{encoded_user}:{encoded_pass}@"
                f"{db_host}:{db_port}/{db_name}"
            )

artifact_service_uri = f"gs://{logs_bucket_name}" if logs_bucket_name else None

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
    artifact_service_uri=artifact_service_uri,
    otel_to_cloud=True,
)
app.title = "clashgpt"
app.description = "API for interacting with the Agent clashgpt"

# Include API router
app.include_router(api_router)


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    logger.log_struct(feedback.model_dump(), severity="INFO")
    return {"status": "success"}


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
