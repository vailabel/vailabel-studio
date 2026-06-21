"""Parsing a local model's free-text label suggestions into clean class names.

Faithful port of `domain/labels.rs`.
"""

from __future__ import annotations

import json
import re

#: Max label suggestions kept from a single turn -- enough to be useful without
#: burying the user in chips.
MAX_LABEL_SUGGESTIONS = 12

# Leading list markers (numbering, bullets, dashes) to strip from a candidate.
_LEADING_MARKERS = re.compile(r"^[\d.\)\(\-*•·# \t]+")
# Surrounding quotes / brackets / trailing dot to trim off.
_SURROUNDING = "\"'`[]{}."


def parse_label_list(raw: str) -> list[str]:
    """Parse a model's free-text answer into a clean list of candidate label names.

    Tolerates the three shapes a local model tends to return: a JSON array
    (`["car","person"]`), a comma-separated line, or a newline/bulleted list.
    Each name is stripped of list markers and quotes, lowercased, and filtered to
    short noun-like phrases (sentences are dropped); duplicates are removed with
    order preserved.
    """
    trimmed = raw.strip()
    array = _extract_json_array(trimmed)
    if array is not None:
        tokens = array
    else:
        tokens = re.split(r"[,\n;/]", trimmed)

    seen: set[str] = set()
    out: list[str] = []
    for token in tokens:
        cleaned = _clean_label_token(token)
        if not cleaned:
            continue
        # Drop sentences/explanations -- class names are short noun phrases.
        if len(cleaned.split()) > 4 or len(cleaned) > 40:
            continue
        if cleaned not in seen:
            seen.add(cleaned)
            out.append(cleaned)
        if len(out) >= MAX_LABEL_SUGGESTIONS:
            break
    return out


def _clean_label_token(token: str) -> str:
    """Normalize one candidate token: strip leading list markers, surrounding
    quotes/brackets, collapse whitespace, and lowercase."""
    stripped = _LEADING_MARKERS.sub("", token.strip())
    stripped = stripped.strip(_SURROUNDING).strip()
    return " ".join(stripped.split()).lower()


def _extract_json_array(raw: str) -> list[str] | None:
    """Extract the first `[...]` JSON array of strings from arbitrary model output."""
    start = raw.find("[")
    if start < 0:
        return None
    end_rel = raw[start:].find("]")
    if end_rel < 0:
        return None
    slice_ = raw[start : start + end_rel + 1]
    try:
        value = json.loads(slice_)
    except (ValueError, TypeError):
        return None
    if not isinstance(value, list):
        return None
    return [entry for entry in value if isinstance(entry, str)]
