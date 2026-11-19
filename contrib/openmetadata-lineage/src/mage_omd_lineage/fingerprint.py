"""Deterministic fingerprint of everything that affects a pipeline's lineage.

Used for change detection: unchanged fingerprint means the previously published lineage
is still accurate. Includes the connector version so analyser improvements force a
re-emit.
"""

from __future__ import annotations

import hashlib
import json

from . import __version__
from .config import Config
from .ir import Pipeline


def pipeline_fingerprint(pipeline: Pipeline, config: Config) -> str:
    pipeline_config = config.raw.get("pipelines", {}).get(pipeline.uuid, {})
    profiles = {block.profile or "default" for block in pipeline.blocks.values()}
    profiles.add("default")
    profile_config = {
        name: config.raw.get("profiles", {}).get(name, {}) for name in sorted(profiles)
    }
    payload = {
        "version": __version__,
        "pipeline": pipeline.uuid,
        "blocks": [
            {
                "uuid": block.uuid,
                "type": block.type,
                "language": block.language,
                "upstream": block.upstream,
                "downstream": block.downstream,
                "configuration": block.configuration,
                "code_sha256": hashlib.sha256(block.code.encode("utf-8")).hexdigest(),
            }
            for block in sorted(pipeline.blocks.values(), key=lambda item: item.uuid)
        ],
        "pipeline_config": pipeline_config,
        "profiles": profile_config,
        "defaults": config.raw.get("defaults", {}),
    }
    encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
