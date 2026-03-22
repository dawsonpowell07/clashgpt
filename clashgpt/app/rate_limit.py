"""
Rate Limiting Configuration

Provides IP-based rate limiting using slowapi.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Create limiter instance using client IP as the default key
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
