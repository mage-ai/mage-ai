import base64
from unittest.mock import MagicMock

from mage_ai.server.kernel_output_parser import DataType
from mage_ai.shared.image_output_detect import (
    sniff_image_mime,
    try_image_payload_from_bytes,
    try_image_payload_from_plain_base64,
    try_image_payload_from_string,
)

# 1x1 transparent PNG
TINY_PNG_B64 = (
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)


def test_sniff_image_mime_png():
    raw = base64.b64decode(TINY_PNG_B64)
    assert sniff_image_mime(raw) == 'image/png'


def test_try_image_payload_from_plain_base64_png():
    result = try_image_payload_from_plain_base64(TINY_PNG_B64)
    assert result is not None
    mime, payload = result
    assert mime == 'image/png'
    assert payload == TINY_PNG_B64


def test_try_image_payload_from_string_plain():
    result = try_image_payload_from_string(f'  {TINY_PNG_B64}  \n')
    assert result is not None
    assert result[0] == 'image/png'


def test_try_image_payload_from_string_data_url():
    result = try_image_payload_from_string(f'data:image/png;base64,{TINY_PNG_B64}')
    assert result is not None
    mime, payload = result
    assert mime == 'image/png'
    assert base64.b64decode(payload) == base64.b64decode(TINY_PNG_B64)


def test_try_image_payload_from_bytes():
    raw = base64.b64decode(TINY_PNG_B64)
    result = try_image_payload_from_bytes(raw)
    assert result is not None
    mime, payload = result
    assert mime == 'image/png'
    assert base64.b64decode(payload) == raw


def test_try_image_payload_from_string_not_image():
    assert try_image_payload_from_string('hello world') is None
    assert try_image_payload_from_string('YQ==') is None  # decodes to b'a'


def _mock_block():
    block = MagicMock()
    block.uuid = 'block_uuid'
    block.configuration = None
    block.upstream_blocks = []
    block.is_dynamic_v2 = False
    block.pipeline.variable_manager = MagicMock()
    block.pipeline.uuid = 'pipeline_uuid'
    return block


def test_format_output_data_base64_string():
    from mage_ai.data_preparation.models.block.outputs import format_output_data

    out, _ = format_output_data(_mock_block(), TINY_PNG_B64, 'output_0')
    assert out['type'] == DataType.IMAGE_PNG
    assert out['text_data'] == TINY_PNG_B64


def test_format_output_data_png_bytes():
    from mage_ai.data_preparation.models.block.outputs import format_output_data

    raw = base64.b64decode(TINY_PNG_B64)
    out, _ = format_output_data(_mock_block(), raw, 'output_0')
    assert out['type'] == DataType.IMAGE_PNG
    assert base64.b64decode(out['text_data']) == raw
