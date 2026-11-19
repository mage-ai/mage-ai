"""Minimal OpenMetadata REST client.

Only the endpoints the connector needs: catalog lookups, pipeline upsert and native
lineage writes. Errors are mapped to a small set of connector errors so the CLI can
return stable exit codes.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote

import requests

from . import errors


def pipeline_lineage_state(record: dict[str, Any] | None) -> dict[str, Any]:
    """Read ``extension.lineage`` from a pipeline record.

    OpenMetadata custom properties are typed; the connector registers ``lineage``
    as a string and stores JSON text, so accept both the string and (older) object
    spellings.
    """
    state = ((record or {}).get("extension") or {}).get("lineage")
    if isinstance(state, str):
        try:
            parsed = json.loads(state)
        except ValueError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return state if isinstance(state, dict) else {}


class OmdError(Exception):
    def __init__(self, message: str, status_code: int | None = None, code: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class AuthError(OmdError):
    pass


class TransientError(OmdError):
    pass


class OmdClient:
    def __init__(
        self,
        host: str,
        token: str,
        auth: str = "jwt",
        verify_tls: bool = True,
        timeout: int = 15,
        session: requests.Session | None = None,
    ):
        if not host:
            raise OmdError("OpenMetadata host is not configured")
        if not token:
            raise OmdError("OpenMetadata token is not configured")
        self.host = host.rstrip("/")
        if self.host.endswith("/api"):
            self.host = self.host[: -len("/api")]
        self.token = token
        self.auth = auth
        self.verify_tls = verify_tls
        self.timeout = timeout
        self.session = session or requests.Session()

    # -- transport -------------------------------------------------------
    def _headers(self) -> dict[str, str]:
        if self.auth == "basic":
            return {"Authorization": f"Basic {self.token}"}
        return {"Authorization": f"Bearer {self.token}"}

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | list[dict[str, Any]] | None = None,
        headers: dict[str, str] | None = None,
        allow_404: bool = False,
    ) -> dict[str, Any] | None:
        url = f"{self.host}/api{path}"
        request_headers = self._headers()
        if headers:
            request_headers.update(headers)
        try:
            response = self.session.request(
                method,
                url,
                headers=request_headers,
                params=params,
                json=json,
                timeout=self.timeout,
                verify=self.verify_tls,
            )
        except requests.RequestException as exc:
            raise TransientError(f"OpenMetadata is unreachable: {exc}", code=errors.UNREACHABLE)

        if response.status_code == 404 and allow_404:
            return None
        if response.status_code in (401, 403):
            raise AuthError(
                f"OpenMetadata rejected the token ({response.status_code})",
                status_code=response.status_code,
                code=errors.AUTH_ERROR,
            )
        if response.status_code >= 500:
            raise TransientError(
                f"OpenMetadata returned {response.status_code}: {response.text[:300]}",
                status_code=response.status_code,
            )
        if response.status_code >= 400:
            raise OmdError(
                f"OpenMetadata returned {response.status_code}: {response.text[:300]}",
                status_code=response.status_code,
            )
        if not response.content:
            return {}
        try:
            return response.json()
        except ValueError:
            return {}

    # -- catalog ---------------------------------------------------------
    def get_table(self, fqn: str, fields: list[str] | None = None) -> dict[str, Any] | None:
        params = {"fields": ",".join(fields or ["columns"])}
        path = f"/v1/tables/name/{quote(fqn, safe='')}"
        return self._request("GET", path, params=params, allow_404=True)

    def get_database_service(self, name: str) -> dict[str, Any] | None:
        path = f"/v1/services/databaseServices/name/{quote(name, safe='')}"
        return self._request("GET", path, allow_404=True)

    def get_pipeline_service(self, name: str) -> dict[str, Any] | None:
        path = f"/v1/services/pipelineServices/name/{quote(name, safe='')}"
        return self._request("GET", path, allow_404=True)

    def create_pipeline_service(self, body: dict[str, Any]) -> dict[str, Any]:
        result = self._request("POST", "/v1/services/pipelineServices", json=body)
        return result or {}

    def get_pipeline(self, fqn: str) -> dict[str, Any] | None:
        path = f"/v1/pipelines/name/{quote(fqn, safe='')}"
        return self._request("GET", path, params={"fields": "tasks,extension"}, allow_404=True)

    def get_type_by_name(self, name: str) -> dict[str, Any] | None:
        path = f"/v1/metadata/types/name/{quote(name, safe='')}"
        return self._request("GET", path, allow_404=True)

    def add_custom_property(self, type_id: str, body: dict[str, Any]) -> dict[str, Any]:
        """Add a custom property to an entity type (``PUT /v1/metadata/types/{id}``)."""
        result = self._request(
            "PUT", f"/v1/metadata/types/{quote(type_id, safe='')}", json=body
        )
        return result or {}

    def create_pipeline(self, body: dict[str, Any]) -> dict[str, Any]:
        result = self._request("POST", "/v1/pipelines", json=body)
        return result or {}

    def patch_pipeline(
        self, pipeline_id: str, operations: list[dict[str, Any]]
    ) -> dict[str, Any]:
        result = self._request(
            "PATCH",
            f"/v1/pipelines/{quote(pipeline_id, safe='')}",
            json=operations,
            headers={"Content-Type": "application/json-patch+json"},
        )
        return result or {}

    # -- lineage ---------------------------------------------------------
    def add_lineage(self, body: dict[str, Any]) -> dict[str, Any]:
        result = self._request("PUT", "/v1/lineage", json=body)
        return result or {}

    def get_lineage(self, fqn: str) -> dict[str, Any] | None:
        path = f"/v1/lineage/table/name/{quote(fqn, safe='')}"
        return self._request("GET", path, params={"upstreamDepth": 3}, allow_404=True)
