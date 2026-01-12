from __future__ import annotations

from dataclasses import asdict, is_dataclass
from enum import Enum
from typing import Any


def serialize_dataclass(value: Any) -> Any:
    if is_dataclass(value):
        return serialize_dataclass(asdict(value))
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {key: serialize_dataclass(val) for key, val in value.items()}
    if isinstance(value, (list, tuple)):
        return [serialize_dataclass(item) for item in value]
    return value
