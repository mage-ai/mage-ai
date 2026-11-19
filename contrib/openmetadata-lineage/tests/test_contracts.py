from __future__ import annotations

from pathlib import Path

from mage_omd_lineage import errors
from mage_omd_lineage.analyze.contracts import analyze_contract_block, parse_contract
from mage_omd_lineage.config import Config
from mage_omd_lineage.ir import (
    CONFIDENCE_CONTRACT,
    CONFIDENCE_TABLE_ONLY,
    Block,
    Pipeline,
)


def make_config(tmp_path: Path) -> Config:
    return Config.from_dict(
        {
            "profiles": {
                "default": {
                    "service": "warehouse",
                    "driver": "postgres",
                    "database": "analytics",
                    "default_schema": "public",
                }
            },
            "pipelines": {"p1": {"enabled": True}},
        },
        tmp_path / "omd_lineage.yaml",
    )


def make_pipeline(block_type: str = "data_loader") -> Pipeline:
    block = Block(
        uuid="b1",
        name="b1",
        type=block_type,
        language="python",
        code="",
    )
    return Pipeline(uuid="p1", name="p1", project="proj", blocks={"b1": block})


def test_contract_fills_profile_database(tmp_path):
    pipeline = make_pipeline()
    contract = parse_contract(
        pipeline.blocks["b1"],
        pipeline,
        make_config(tmp_path),
        {
            "inputs": ["raw.orders"],
            "outputs": ["mart.summary"],
            "columns": [{"to": "id", "from": ["raw.orders.id"]}],
        },
    )
    assert contract.inputs[0].table.raw == "analytics.raw.orders"
    assert contract.inputs[0].table.schema == "raw"
    assert contract.outputs[0].table.raw == "analytics.mart.summary"
    assert contract.columns[0].origins[0].table.raw == "analytics.raw.orders"
    assert contract.columns[0].origins[0].column == "id"


def test_contract_block_reference(tmp_path):
    pipeline = make_pipeline()
    contract = parse_contract(
        pipeline.blocks["b1"],
        pipeline,
        make_config(tmp_path),
        {
            "inputs": ["block:upstream"],
            "outputs": ["block:b1"],
            "columns": [{"to": "id", "from": ["block:upstream.id"]}],
        },
    )
    assert contract.inputs[0].kind == "block"
    assert contract.inputs[0].block_uuid == "upstream"
    assert contract.outputs[0].key().kind == "virtual"
    assert contract.columns[0].origins[0].block_uuid == "upstream"


def test_contract_transform_confidence_and_columns(tmp_path):
    pipeline = make_pipeline()
    transform = analyze_contract_block(
        pipeline.blocks["b1"],
        pipeline,
        make_config(tmp_path),
        {
            "outputs": ["mart.summary"],
            "columns": [
                {"to": "revenue", "from": ["raw.orders.amount"], "function": "SUM"}
            ],
        },
    )
    assert transform.confidence == CONFIDENCE_CONTRACT
    assert [key.label for key in transform.outputs] == ["analytics.mart.summary"]
    assert transform.columns["revenue"].function == "SUM"


def test_contract_without_columns_is_table_only(tmp_path):
    pipeline = make_pipeline()
    transform = analyze_contract_block(
        pipeline.blocks["b1"],
        pipeline,
        make_config(tmp_path),
        {"outputs": ["mart.summary"]},
    )
    assert transform.confidence == CONFIDENCE_TABLE_ONLY
    assert transform.outputs[0].kind == "table"


def test_invalid_contract_entries_report_issues(tmp_path):
    pipeline = make_pipeline()
    transform = analyze_contract_block(
        pipeline.blocks["b1"],
        pipeline,
        make_config(tmp_path),
        {
            "outputs": ["mart.summary"],
            "columns": [
                {"from": ["raw.orders.id"]},
                {"to": "bad", "from": ["not-a-column"]},
            ],
        },
    )
    codes = [issue.code for issue in transform.issues]
    assert codes.count(errors.CONTRACT_ERROR) == 2
