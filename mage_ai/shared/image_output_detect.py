import base64
import binascii
import re
from typing import Optional, Tuple

from mage_ai.settings.server import MAX_OUTPUT_IMAGE_PREVIEW_SIZE

_DATA_URL_RE = re.compile(
    r'^data:(image/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$',
    re.IGNORECASE,
)


def sniff_image_mime(raw: bytes) -> Optional[str]:
    if not raw or len(raw) < 12:
        return None
    if raw.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if raw.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    if raw.startswith(b'GIF87a') or raw.startswith(b'GIF89a'):
        return 'image/gif'
    if raw.startswith(b'RIFF') and len(raw) >= 12 and raw[8:12] == b'WEBP':
        return 'image/webp'
    return None


def _normalize_jpeg_mime(mime: str) -> str:
    if mime.lower() in ('image/jpg', 'image/jpeg'):
        return 'image/jpeg'
    return mime.lower()


def try_image_payload_from_data_url(s: str) -> Optional[Tuple[str, str]]:
    s = s.strip()
    m = _DATA_URL_RE.match(s)
    if not m:
        return None
    mime = _normalize_jpeg_mime(m.group(1))
    if not mime.startswith('image/') or mime == 'image/svg+xml':
        return None
    b64_part = re.sub(r'\s+', '', m.group(2))
    if not b64_part:
        return None
    try:
        raw = base64.b64decode(b64_part, validate=True)
    except (binascii.Error, ValueError):
        return None
    if len(raw) > MAX_OUTPUT_IMAGE_PREVIEW_SIZE:
        return None
    sniffed = sniff_image_mime(raw)
    if sniffed:
        mime = sniffed
    elif mime not in ('image/png', 'image/jpeg', 'image/gif', 'image/webp'):
        return None
    payload = base64.b64encode(raw).decode('ascii')
    return mime, payload


def try_image_payload_from_plain_base64(s: str) -> Optional[Tuple[str, str]]:
    cleaned = re.sub(r'\s+', '', s.strip())
    if len(cleaned) < 32:
        return None
    try:
        raw = base64.b64decode(cleaned, validate=True)
    except (binascii.Error, ValueError):
        return None
    if len(raw) > MAX_OUTPUT_IMAGE_PREVIEW_SIZE:
        return None
    mime = sniff_image_mime(raw)
    if not mime:
        return None
    return mime, cleaned


def try_image_payload_from_string(s: str) -> Optional[Tuple[str, str]]:
    if not s or not isinstance(s, str):
        return None
    from_data = try_image_payload_from_data_url(s)
    if from_data:
        return from_data
    return try_image_payload_from_plain_base64(s)


def try_image_payload_from_bytes(data: bytes) -> Optional[Tuple[str, str]]:
    if not data:
        return None
    if len(data) > MAX_OUTPUT_IMAGE_PREVIEW_SIZE:
        return None
    mime = sniff_image_mime(data)
    if not mime:
        return None
    payload = base64.b64encode(data).decode('ascii')
    return mime, payload
