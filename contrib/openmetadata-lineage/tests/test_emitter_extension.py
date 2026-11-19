from __future__ import annotations

import json

from mage_omd_lineage.config import Config
from mage_omd_lineage.emit.emitter import Emitter
from mage_omd_lineage.omd import pipeline_lineage_state
from mage_omd_lineage.read.repo import RepoReader

from fake_omd import FakeOmdClient


class TypeAwareFakeOmd(FakeOmdClient):
    """Fake with the metadata type API used to probe custom properties."""

    def __init__(self, properties: set[str] | None = None, fail_add: bool = False):
        super().__init__()
        self.properties = set(properties or ())
        self.fail_add = fail_add
        self.added: list[dict] = []

    def get_type_by_name(self, name: str):
        if name == "pipeline":
            return {
                "id": "type::pipeline",
                "name": "pipeline",
                "customProperties": [{"name": prop} for prop in self.properties],
            }
        if name == "string":
            return {"id": "type::string", "name": "string"}
        return None

    def add_custom_property(self, type_id: str, body: dict):
        if self.fail_add:
            from mage_omd_lineage.omd import OmdError

            raise OmdError("not allowed", status_code=403)
        self.added.append({"type_id": type_id, **body})
        self.properties.add(body["name"])
        return {
            "id": type_id,
            "name": "pipeline",
            "customProperties": [{"name": prop} for prop in self.properties],
        }


def make_emitter(config: Config, client, demo_project) -> tuple[Emitter, object]:
    reader = RepoReader(demo_project)
    return Emitter(config, client), reader.load_pipeline("demo_lineage")


def test_emitter_registers_lineage_property_once(config, demo_project):
    client = TypeAwareFakeOmd()
    emitter, pipeline = make_emitter(config, client, demo_project)

    emitter.ensure_pipeline(pipeline, "demo_project", fingerprint="fp1")
    emitter.ensure_pipeline(pipeline, "demo_project", fingerprint="fp1")

    assert len(client.added) == 1
    assert client.added[0]["type_id"] == "type::pipeline"
    assert client.added[0]["name"] == "lineage"
    assert client.added[0]["propertyType"]["id"] == "type::string"

    record = client.pipelines["mage.demo_project__demo_lineage"]
    state = pipeline_lineage_state(record)
    assert state["fingerprint"] == "fp1"


def test_emitter_skips_extension_when_property_cannot_be_registered(
    config, demo_project
):
    client = TypeAwareFakeOmd(fail_add=True)
    emitter, pipeline = make_emitter(config, client, demo_project)

    emitter.ensure_pipeline(pipeline, "demo_project", fingerprint="fp1")

    create_calls = [call for call in client.calls if call[0] == "create_pipeline"]
    assert create_calls
    assert "extension" not in create_calls[0][1]
    # The pipeline still exists; fingerprint state falls back to the local store.
    assert "mage.demo_project__demo_lineage" in client.pipelines


def test_emitter_respects_custom_properties_off(config, demo_project):
    client = TypeAwareFakeOmd()
    config.openmetadata.custom_properties = "off"
    emitter, pipeline = make_emitter(config, client, demo_project)

    emitter.ensure_pipeline(pipeline, "demo_project", fingerprint="fp1")

    assert client.added == []
    create_calls = [call for call in client.calls if call[0] == "create_pipeline"]
    assert "extension" not in create_calls[0][1]


def test_existing_property_is_reused_without_registration(config, demo_project):
    client = TypeAwareFakeOmd(properties={"lineage"})
    emitter, pipeline = make_emitter(config, client, demo_project)

    emitter.ensure_pipeline(pipeline, "demo_project", fingerprint="fp1")

    assert client.added == []
    state = pipeline_lineage_state(client.pipelines["mage.demo_project__demo_lineage"])
    assert state["fingerprint"] == "fp1"


def test_pipeline_lineage_state_accepts_json_string_and_object():
    state = {"fingerprint": "abc", "last_status": "ok"}
    assert pipeline_lineage_state({"extension": {"lineage": json.dumps(state)}}) == state
    assert pipeline_lineage_state({"extension": {"lineage": state}}) == state
    assert pipeline_lineage_state({"extension": {"lineage": "not-json"}}) == {}
    assert pipeline_lineage_state(None) == {}
