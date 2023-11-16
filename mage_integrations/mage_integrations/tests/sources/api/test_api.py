import unittest
from unittest.mock import MagicMock, patch

from mage_integrations.sources.api import Api


def csv_catalog_example():
    return {
        'streams': [
            {
                'tap_stream_id': 'api',
                'replication_method': 'FULL_TABLE',
                'key_properties': [],
                'schema': {
                    'properties': {
                        'teste': {'type': ['null', 'integer']},
                        'first_name': {'type': ['null', 'string']},
                        'second_name': {'type': ['null', 'string']},
                        'email': {'type': ['null', 'string']},
                    },
                    'type': 'object',
                },
                'stream': 'api',
                'metadata': [
                    {
                        'breadcrumb': (),
                        'metadata': {
                            'table-key-properties': [],
                            'forced-replication-method': 'FULL_TABLE',
                            'inclusion': 'available',
                            'schema-name': 'api',
                        },
                    },
                    {
                        'breadcrumb': ('properties', 'teste'),
                        'metadata': {'inclusion': 'available'},
                    },
                    {
                        'breadcrumb': ('properties', 'first_name'),
                        'metadata': {'inclusion': 'available'},
                    },
                    {
                        'breadcrumb': ('properties', 'second_name'),
                        'metadata': {'inclusion': 'available'},
                    },
                    {
                        'breadcrumb': ('properties', 'email'),
                        'metadata': {'inclusion': 'available'},
                    },
                ],
                'auto_add_new_fields': False,
                'unique_conflict_method': 'UPDATE',
            }
        ]
    }


def json_catalog_example():
    return {
        "streams": [
            {
                "tap_stream_id": "api",
                "replication_method": "FULL_TABLE",
                "key_properties": [],
                "schema": {
                    "properties": {
                        "id": {"type": ["null", "string"]},
                        "symbol": {"type": ["null", "string"]},
                        "name": {"type": ["null", "string"]},
                        "image": {"type": ["null", "string"]},
                        "current_price": {"type": ["null", "number"]},
                        "market_cap": {"type": ["null", "integer"]},
                        "market_cap_rank": {"type": ["null", "integer"]},
                        "fully_diluted_valuation": {"type": ["null", "number"]},
                        "total_volume": {"type": ["null", "number"]},
                        "high_24h": {"type": ["null", "number"]},
                        "low_24h": {"type": ["null", "number"]},
                        "price_change_24h": {"type": ["null", "number"]},
                        "price_change_percentage_24h": {"type": ["null", "number"]},
                        "market_cap_change_24h": {"type": ["null", "number"]},
                        "market_cap_change_percentage_24h": {
                            "type": ["null", "number"]
                        },
                        "circulating_supply": {"type": ["null", "number"]},
                        "total_supply": {"type": ["null", "number"]},
                        "max_supply": {"type": ["null", "number"]},
                        "ath": {"type": ["null", "number"]},
                        "ath_change_percentage": {"type": ["null", "number"]},
                        "ath_date": {"type": ["null", "string"]},
                        "atl": {"type": ["null", "number"]},
                        "atl_change_percentage": {"type": ["null", "number"]},
                        "atl_date": {"type": ["null", "string"]},
                        "roi": {"type": ["null", "object"]},
                        "last_updated": {"type": ["null", "string"]},
                    },
                    "type": "object",
                },
                "stream": "api",
                "metadata": [
                    {
                        "breadcrumb": (),
                        "metadata": {
                            "table-key-properties": [],
                            "forced-replication-method": "FULL_TABLE",
                            "inclusion": "available",
                            "schema-name": "api",
                        },
                    },
                    {
                        "breadcrumb": ("properties", "id"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "symbol"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "name"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "image"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "current_price"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "market_cap"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "market_cap_rank"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "fully_diluted_valuation"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "total_volume"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "high_24h"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "low_24h"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "price_change_24h"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "price_change_percentage_24h"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "market_cap_change_24h"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": (
                            "properties",
                            "market_cap_change_percentage_24h",
                        ),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "circulating_supply"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "total_supply"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "max_supply"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "ath"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "ath_change_percentage"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "ath_date"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "atl"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "atl_change_percentage"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "atl_date"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "roi"),
                        "metadata": {"inclusion": "available"},
                    },
                    {
                        "breadcrumb": ("properties", "last_updated"),
                        "metadata": {"inclusion": "available"},
                    },
                ],
                "auto_add_new_fields": False,
                "unique_conflict_method": "UPDATE",
            }
        ]
    }


class ApiTest(unittest.TestCase):

    def test_api_csv(self):
        source = Api(
            config=dict(
                url='https://docs.google.com/spreadsheets/d/e/2PACX-1vTLcLUBAJAWf-8NQSjlbB3E4LR6DWk5QIZC-KtRb1j2CXXcgY6mE6vOJAW8PoJ1BAOgjXYpE4tY1LAD/pub?gid=1322931542&single=true&output=csv',  # noqa
                has_header=True,
            )
        )
        api_connection = MagicMock()

        with patch.object(
            source, 'test_connection', return_value=api_connection
        ) as mock_build_connection:
            source.test_connection()

            catalog = source.discover()
            self.assertEqual(catalog.to_dict(), csv_catalog_example())
            mock_build_connection.assert_called()

    def test_api_tsv(self):
        source = Api(
            config=dict(
                url='https://docs.google.com/spreadsheets/d/e/2PACX-1vTLcLUBAJAWf-8NQSjlbB3E4LR6DWk5QIZC-KtRb1j2CXXcgY6mE6vOJAW8PoJ1BAOgjXYpE4tY1LAD/pub?gid=1322931542&single=true&output=tsv',  # noqa
                has_header=True,
            )
        )
        api_connection = MagicMock()

        with patch.object(
            source, 'test_connection', return_value=api_connection
        ) as mock_build_connection:
            source.test_connection()

            catalog = source.discover()
            self.assertEqual(catalog.to_dict(), csv_catalog_example())
            mock_build_connection.assert_called()

    def test_api_xlsx(self):
        source = Api(
            config=dict(
                url='https://docs.google.com/spreadsheets/d/e/2PACX-1vTLcLUBAJAWf-8NQSjlbB3E4LR6DWk5QIZC-KtRb1j2CXXcgY6mE6vOJAW8PoJ1BAOgjXYpE4tY1LAD/pub?output=xlsx',  # noqa
                has_header=True,
            )
        )
        api_connection = MagicMock()

        with patch.object(
            source, 'test_connection', return_value=api_connection
        ) as mock_build_connection:
            source.test_connection()

            catalog = source.discover()
            self.assertEqual(catalog.to_dict(), csv_catalog_example())
            mock_build_connection.assert_called()

    def test_api_json(self):
        source = Api(
            config=dict(
                url='https://gist.githubusercontent.com/dy46/d687858dd40871d09aa668fae96c5bbe/raw/c682a8d12fa7a0bdb8b95912f0ea0a1b58fbb046/response.json',  # noqa: E501
                method='GET',
            )
        )
        api_connection = MagicMock()

        with patch.object(
            source, 'test_connection', return_value=api_connection
        ) as mock_build_connection:
            source.test_connection()
            mock_build_connection.assert_called_once()

            catalog = source.discover()

            self.assertEqual(catalog.to_dict(), json_catalog_example())
