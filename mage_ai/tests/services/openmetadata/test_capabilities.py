from __future__ import annotations

from mage_ai.services.openmetadata.lineage.capabilities import (
    DELEGATED,
    SUPPORTED,
    UNSUPPORTED,
    CapabilityMap,
)


def test_postgres_supported():
    capability_map = CapabilityMap.load()
    capability = capability_map.lookup("postgres")
    assert capability.state == SUPPORTED
    assert capability.platform == "Postgres"


def test_duckdb_unsupported():
    capability_map = CapabilityMap.load()
    capability = capability_map.lookup("duckdb")
    assert capability.state == UNSUPPORTED
    assert capability.platform is None


def test_spark_delegated():
    capability_map = CapabilityMap.load()
    capability = capability_map.lookup("spark")
    assert capability.state == DELEGATED
    assert capability.platform == "Databricks"


def test_unknown_driver_unsupported():
    capability_map = CapabilityMap.load()
    capability = capability_map.lookup("not-a-driver")
    assert capability.state == UNSUPPORTED
    assert "not in the capability map" in (capability.note or "")


def test_missing_driver_unsupported():
    capability_map = CapabilityMap.load()
    capability = capability_map.lookup(None)
    assert capability.state == UNSUPPORTED


def test_lookup_is_case_insensitive():
    capability_map = CapabilityMap.load()
    assert capability_map.lookup("PostgreSQL").state == SUPPORTED


def test_as_rows_sorted():
    rows = CapabilityMap.load().as_rows()
    drivers = [row["driver"] for row in rows]
    assert drivers == sorted(drivers)
    assert any(row["driver"] == "duckdb" for row in rows)
