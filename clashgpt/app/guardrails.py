"""
Agent Guardrails

Implements ADK callbacks to validate and filter inputs/outputs to the LLM,
protecting against prompt injection, jailbreaks, and excessive message length.
"""

import logging
import re

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types

logger = logging.getLogger(__name__)

# Maximum characters allowed in a single user message
MAX_MESSAGE_LENGTH = 1500

# Patterns that signal prompt injection or jailbreak attempts
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"forget\s+(all\s+)?your\s+instructions",
    r"disregard\s+(all\s+)?previous",
    r"override\s+your\s+(instructions|guidelines|rules)",
    r"pretend\s+you\s+are",
    r"act\s+as\s+if\s+you\s+(have\s+no|are\s+not)",
    r"roleplay\s+as\s+(?!clash|a\s+clash)",  # allow clash royale roleplay
    r"your\s+new\s+(instructions|persona|role)",
    r"new\s+persona",
    r"\bDAN\b",
    r"\bjailbreak\b",
    r"bypass\s+(your\s+)?(safety|filter|restriction|guardrail)",
    r"you\s+have\s+no\s+(restrictions|limits|guidelines|rules)",
    r"reveal\s+your\s+(instructions|system\s+prompt|prompt)",
    r"print\s+your\s+(instructions|system\s+prompt|prompt)",
    r"show\s+me\s+your\s+(instructions|system\s+prompt|prompt)",
    r"what\s+(are|were)\s+your\s+(instructions|system\s+prompt)",
    r"repeat\s+(everything|all\s+of)\s+(above|before)",
    r"from\s+now\s+on\s+you\s+(are|will)",
]
_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]

_INJECTION_RESPONSE = (
    "I'm ClashGPT, your Clash Royale assistant! I'm here to help with deck "
    "building, player stats, clan info, and game strategy. What would you like "
    "to know about Clash Royale?"
)

_LENGTH_RESPONSE = (
    f"Your message is too long (max {MAX_MESSAGE_LENGTH} characters). "
    "Please shorten your question and I'll be happy to help!"
)


def _extract_last_user_message(llm_request: LlmRequest) -> str:
    """Return the text of the most recent user message, or empty string."""
    if not llm_request.contents:
        return ""
    for content in reversed(llm_request.contents):
        if content.role == "user" and content.parts:
            for part in content.parts:
                if hasattr(part, "text") and part.text:
                    return part.text
    return ""


def _blocked_response(text: str) -> LlmResponse:
    return LlmResponse(
        content=types.Content(
            role="model",
            parts=[types.Part(text=text)],
        )
    )


def input_guardrail(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> LlmResponse | None:
    """
    Before-model callback — validates user input before it reaches the LLM.

    Blocks:
    - Messages exceeding MAX_MESSAGE_LENGTH characters
    - Prompt injection and jailbreak attempts
    """
    message = _extract_last_user_message(llm_request)
    if not message:
        return None

    # --- Length check ---
    if len(message) > MAX_MESSAGE_LENGTH:
        logger.warning(
            "Guardrail: blocked oversized message",
            extra={"length": len(message), "agent": callback_context.agent_name},
        )
        return _blocked_response(_LENGTH_RESPONSE)

    # --- Prompt injection check ---
    for pattern in _COMPILED_PATTERNS:
        if pattern.search(message):
            logger.warning(
                "Guardrail: blocked prompt injection attempt",
                extra={
                    "pattern": pattern.pattern,
                    "preview": message[:120],
                    "agent": callback_context.agent_name,
                },
            )
            return _blocked_response(_INJECTION_RESPONSE)

    return None  # Allow the LLM call to proceed
