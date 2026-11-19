"""In-memory OpenMetadata double used by the unit tests."""

from __future__ import annotations

from typing import Any

from mage_omd_lineage import errors
from mage_omd_lineage.omd import AuthError, OmdError


def table_record(fqn: str, columns: list[str]) -> dict[str, Any]:
    return {
        "id": f"id::{fqn}",
        "fullyQualifiedName": fqn,
        "columns": [{"name": column} for column in columns],
    }


DEFAULT_TABLES: dict[str, list[str]] = {
    "warehouse_demo.analytics.raw.orders": [
        "id",
        "customer_id",
        "amount",
        "status",
        "ordered_at",
    ],
    "warehouse_demo.analytics.raw.customers": ["id", "country"],
    "warehouse_demo.analytics.stg.orders_clean": [
        "order_id",
        "customer_id",
        "amount",
        "ordered_at",
    ],
    "warehouse_demo.analytics.mart.customer_revenue": [
        "customer_id",
        "country",
        "order_count",
        "revenue",
    ],
    "warehouse_demo.analytics.mart.customer_revenue_export": [
        "customer_id",
        "country",
        "order_count",
        "revenue",
    ],
}


class FakeOmdClient:
    def __init__(
        self,
        tables: dict[str, list[str]] | None = None,
        services: dict[str, str] | None = None,
        fail_lineage: bool = False,
        fail_auth: bool = False,
    ):
        source = DEFAULT_TABLES if tables is None else tables
        self.tables = {fqn: table_record(fqn, columns) for fqn, columns in source.items()}
        self.services = services if services is not None else {"warehouse_demo": "Postgres"}
        self.pipelines: dict[str, dict[str, Any]] = {}
        self.lineage: list[dict[str, Any]] = []
        self.fail_lineage = fail_lineage
        self.fail_auth = fail_auth
        self.calls: list[tuple[str, Any]] = []

    # -- catalog ---------------------------------------------------------
    def get_table(self, fqn: str, fields: list[str] | None = None) -> dict[str, Any] | None:
        self.calls.append(("get_table", fqn))
        if self.fail_auth:
            raise AuthError("token rejected", status_code=401, code=errors.AUTH_ERROR)
        return self.tables.get(fqn)

    def get_database_service(self, name: str) -> dict[str, Any] | None:
        self.calls.append(("get_database_service", name))
        service_type = self.services.get(name)
        if service_type is None:
            return None
        return {"name": name, "serviceType": service_type}

    def get_pipeline_service(self, name: str) -> dict[str, Any] | None:
        self.calls.append(("get_pipeline_service", name))
        return {"name": name, "serviceType": "CustomPipeline"}

    def create_pipeline_service(self, body: dict[str, Any]) -> dict[str, Any]:
        self.calls.append(("create_pipeline_service", body))
        return body

    # -- pipelines -------------------------------------------------------
    def get_pipeline(self, fqn: str) -> dict[str, Any] | None:
        self.calls.append(("get_pipeline", fqn))
        return self.pipelines.get(fqn)

    def create_pipeline(self, body: dict[str, Any]) -> dict[str, Any]:
        self.calls.append(("create_pipeline", body))
        name = body["name"]
        service = body.get("service", "mage")
        fqn = f"{service}.{name}"
        record = dict(body)
        record["id"] = f"pipeline::{fqn}"
        record["fullyQualifiedName"] = fqn
        record.setdefault("extension", {})
        self.pipelines[fqn] = record
        return record

    def patch_pipeline(
        self, pipeline_id: str, operations: list[dict[str, Any]]
    ) -> dict[str, Any]:
        self.calls.append(("patch_pipeline", operations))
        for record in self.pipelines.values():
            if record.get("id") != pipeline_id:
                continue
            for operation in operations:
                path = operation.get("path", "").lstrip("/")
                value = operation.get("value")
                if path == "extension" and isinstance(value, dict):
                    merged = dict(record.get("extension") or {})
                    merged.update(value)
                    record["extension"] = merged
                elif path:
                    record[path] = value
            return record
        return {}

    # -- lineage ---------------------------------------------------------
    def add_lineage(self, body: dict[str, Any]) -> dict[str, Any]:
        self.calls.append(("add_lineage", body))
        if self.fail_lineage:
            raise OmdError(
                "OpenMetadata is unreachable", status_code=503, code=errors.UNREACHABLE
            )
        self.lineage.append(body)
        return {"entity": body}

    def get_lineage(self, fqn: str) -> dict[str, Any] | None:
        return None
