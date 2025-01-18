'''
import unittest
from unittest.mock import MagicMock, patch

from mage_integrations.sources.couchbase import Couchbase


def sample_discover_results():
    return [[
        {
            "#docs": 1000,
            "$schema": "http://json-schema.org/draft-06/schema",
            "Flavor": '`stops` = 0, `type` = "route"',
            "properties": {
                "airline": {
                    "#docs": 1000,
                    "%docs": 100,
                    "samples": ["AZ", "FL", "G4", "UA", "US"],
                    "type": "string",
                },
                "airlineid": {
                    "#docs": 1000,
                    "%docs": 100,
                    "samples": [
                        "airline_1316",
                        "airline_35",
                        "airline_5209",
                        "airline_5265",
                        "airline_596",
                    ],
                    "type": "string",
                },
                "destinationairport": {
                    "#docs": 1000,
                    "%docs": 100,
                    "samples": ["CLT", "MRS", "MSY", "ORD", "PGD"],
                    "type": "string",
                },
                "distance": {
                    "#docs": 1000,
                    "%docs": 100,
                    "samples": [
                        338.1158280273106,
                        539.1967749377392,
                        1137.844142824115,
                        1641.2742611910512,
                        1877.4335497877148,
                    ],
                    "type": "number",
                },
                "equipment": {
                    "#docs": [1, 999],
                    "%docs": [0.1, 99.9],
                    "samples": [[None], ["320 AT7", "73W", "CRJ", "CRJ ERJ", "M80"]],
                    "type": ["null", "string"],
                },
                "id": {
                    "#docs": 1000,
                    "%docs": 100,
                    "samples": [12920, 25077, 28857, 57895, 58912],
                    "type": "number",
                },
                "schedule": {
                    "#docs": 1000,
                    "%docs": 100,
                    "items": {
                        "#docs": 21245,
                        "$schema": "http://json-schema.org/draft-06/schema",
                        "properties": {
                            "day": {"type": "number"},
                            "flight": {"type": "string"},
                            "utc": {"type": "string"},
                        },
                        "type": "object",
                    },
                    "maxItems": 33,
                    "minItems": 10,
                    "samples": [
                        [
                            {"day": 0, "flight": "AZ206", "utc": "12:02:00"},
                            {"day": 1, "flight": "AZ073", "utc": "19:01:00"},
                            {"day": 1, "flight": "AZ460", "utc": "04:24:00"},
                            {"day": 1, "flight": "AZ773", "utc": "13:13:00"},
                            {"day": 1, "flight": "AZ444", "utc": "12:07:00"},
                            {"day": 2, "flight": "AZ257", "utc": "12:22:00"},
                            {"day": 2, "flight": "AZ369", "utc": "07:38:00"},
                            {"day": 2, "flight": "AZ908", "utc": "18:49:00"},
                            {"day": 2, "flight": "AZ824", "utc": "10:55:00"},
                            {"day": 3, "flight": "AZ381", "utc": "10:15:00"},
                            {"day": 3, "flight": "AZ507", "utc": "04:25:00"},
                            {"day": 3, "flight": "AZ391", "utc": "22:05:00"},
                            {"day": 3, "flight": "AZ465", "utc": "20:22:00"},
                            {"day": 3, "flight": "AZ528", "utc": "06:34:00"},
                            {"day": 4, "flight": "AZ040", "utc": "05:03:00"},
                            {"day": 4, "flight": "AZ897", "utc": "11:11:00"},
                            {"day": 4, "flight": "AZ301", "utc": "13:03:00"},
                            {"day": 5, "flight": "AZ849", "utc": "08:04:00"},
                            {"day": 6, "flight": "AZ993", "utc": "05:05:00"},
                            {"day": 6, "flight": "AZ075", "utc": "06:29:00"},
                            {"day": 6, "flight": "AZ916", "utc": "10:18:00"},
                        ],
                        [
                            {"day": 0, "flight": "FL753", "utc": "05:07:00"},
                            {"day": 0, "flight": "FL662", "utc": "05:44:00"},
                            {"day": 0, "flight": "FL091", "utc": "15:21:00"},
                            {"day": 1, "flight": "FL296", "utc": "01:12:00"},
                            {"day": 1, "flight": "FL421", "utc": "08:06:00"},
                            {"day": 1, "flight": "FL565", "utc": "23:17:00"},
                            {"day": 1, "flight": "FL638", "utc": "02:56:00"},
                            {"day": 1, "flight": "FL410", "utc": "08:34:00"},
                            {"day": 2, "flight": "FL616", "utc": "15:01:00"},
                            {"day": 3, "flight": "FL847", "utc": "00:32:00"},
                            {"day": 3, "flight": "FL583", "utc": "09:29:00"},
                            {"day": 4, "flight": "FL475", "utc": "00:51:00"},
                            {"day": 5, "flight": "FL085", "utc": "22:07:00"},
                            {"day": 5, "flight": "FL145", "utc": "20:32:00"},
                            {"day": 5, "flight": "FL712", "utc": "08:06:00"},
                            {"day": 6, "flight": "FL374", "utc": "22:09:00"},
                            {"day": 6, "flight": "FL307", "utc": "08:41:00"},
                            {"day": 6, "flight": "FL250", "utc": "23:28:00"},
                        ],
                        [
                            {"day": 0, "flight": "G4983", "utc": "14:38:00"},
                            {"day": 0, "flight": "G4962", "utc": "04:25:00"},
                            {"day": 0, "flight": "G4708", "utc": "14:14:00"},
                            {"day": 1, "flight": "G4358", "utc": "11:33:00"},
                            {"day": 2, "flight": "G4426", "utc": "06:56:00"},
                            {"day": 3, "flight": "G4094", "utc": "12:54:00"},
                            {"day": 4, "flight": "G4831", "utc": "18:51:00"},
                            {"day": 5, "flight": "G4770", "utc": "12:23:00"},
                            {"day": 5, "flight": "G4281", "utc": "14:11:00"},
                            {"day": 6, "flight": "G4372", "utc": "17:35:00"},
                            {"day": 6, "flight": "G4492", "utc": "15:39:00"},
                            {"day": 6, "flight": "G4622", "utc": "01:42:00"},
                            {"day": 6, "flight": "G4251", "utc": "16:18:00"},
                        ],
                        [
                            {"day": 0, "flight": "UA307", "utc": "16:46:00"},
                            {"day": 0, "flight": "UA796", "utc": "03:49:00"},
                            {"day": 0, "flight": "UA517", "utc": "19:27:00"},
                            {"day": 1, "flight": "UA776", "utc": "03:52:00"},
                            {"day": 1, "flight": "UA570", "utc": "06:01:00"},
                            {"day": 1, "flight": "UA243", "utc": "05:24:00"},
                            {"day": 1, "flight": "UA975", "utc": "14:58:00"},
                            {"day": 1, "flight": "UA839", "utc": "06:30:00"},
                            {"day": 2, "flight": "UA139", "utc": "07:45:00"},
                            {"day": 2, "flight": "UA518", "utc": "00:15:00"},
                            {"day": 2, "flight": "UA771", "utc": "06:05:00"},
                            {"day": 2, "flight": "UA114", "utc": "18:06:00"},
                            {"day": 3, "flight": "UA695", "utc": "02:22:00"},
                            {"day": 3, "flight": "UA206", "utc": "14:48:00"},
                            {"day": 3, "flight": "UA557", "utc": "22:12:00"},
                            {"day": 3, "flight": "UA163", "utc": "03:20:00"},
                            {"day": 3, "flight": "UA229", "utc": "21:29:00"},
                            {"day": 4, "flight": "UA071", "utc": "18:56:00"},
                            {"day": 4, "flight": "UA352", "utc": "14:22:00"},
                            {"day": 4, "flight": "UA848", "utc": "14:19:00"},
                            {"day": 4, "flight": "UA853", "utc": "19:13:00"},
                            {"day": 4, "flight": "UA871", "utc": "02:56:00"},
                            {"day": 5, "flight": "UA112", "utc": "04:44:00"},
                            {"day": 5, "flight": "UA070", "utc": "18:37:00"},
                            {"day": 5, "flight": "UA617", "utc": "13:04:00"},
                            {"day": 5, "flight": "UA235", "utc": "16:42:00"},
                            {"day": 5, "flight": "UA518", "utc": "23:09:00"},
                            {"day": 6, "flight": "UA408", "utc": "09:07:00"},
                            {"day": 6, "flight": "UA279", "utc": "07:47:00"},
                            {"day": 6, "flight": "UA255", "utc": "17:57:00"},
                        ],
                        [
                            {"day": 0, "flight": "US323", "utc": "02:39:00"},
                            {"day": 0, "flight": "US763", "utc": "11:35:00"},
                            {"day": 0, "flight": "US591", "utc": "16:43:00"},
                            {"day": 0, "flight": "US474", "utc": "05:48:00"},
                            {"day": 1, "flight": "US137", "utc": "13:45:00"},
                            {"day": 2, "flight": "US297", "utc": "05:10:00"},
                            {"day": 2, "flight": "US519", "utc": "18:53:00"},
                            {"day": 3, "flight": "US820", "utc": "09:28:00"},
                            {"day": 3, "flight": "US434", "utc": "06:50:00"},
                            {"day": 4, "flight": "US003", "utc": "16:21:00"},
                            {"day": 4, "flight": "US468", "utc": "18:18:00"},
                            {"day": 4, "flight": "US999", "utc": "07:48:00"},
                            {"day": 5, "flight": "US226", "utc": "22:28:00"},
                            {"day": 5, "flight": "US737", "utc": "16:07:00"},
                            {"day": 6, "flight": "US626", "utc": "13:23:00"},
                            {"day": 6, "flight": "US405", "utc": "14:16:00"},
                            {"day": 6, "flight": "US880", "utc": "03:20:00"},
                            {"day": 6, "flight": "US636", "utc": "11:13:00"},
                            {"day": 6, "flight": "US087", "utc": "05:17:00"},
                        ],
                    ],
                    "type": "array",
                },
                "sourceairport": {
                    "#docs": 1000,
                    "%docs": 100,
                    "samples": ["ABE", "AJA", "CVG", "EWR", "YWG"],
                    "type": "string",
                },
                "stops": {"#docs": 1000, "%docs": 100, "samples": [0], "type": "number"},
                "type": {
                    "#docs": 1000,
                    "%docs": 100,
                    "samples": ["route"],
                    "type": "string",
                },
            },
            "type": "object",
        }
    ]]

class CouchbaseSourceTests(unittest.TestCase):
    def test_discover(self):
        source = Couchbase(config=dict(bucket="travel-sample"))
        couchbase_connection = MagicMock()
        couchbase_connection.load.return_value = sample_discover_results()
        couchbase_connection.get_all_collections.return_value = ['route']
        with patch.object(
            source,
            'build_connection',
            return_value=couchbase_connection
        ) as mock_build_connection:
            catalog = source.discover()

            mock_build_connection.assert_called()
            self.assertDictEqual(
                {
                    "streams": [
                        {
                            "auto_add_new_fields": False,
                            "key_properties": [],
                            "metadata": [
                                {
                                    "breadcrumb": (),
                                    "metadata": {
                                        "forced-replication-method": "FULL_TABLE",
                                        "inclusion": "available",
                                        "schema-name": "route",
                                        "selected": False,
                                        "table-key-properties": [],
                                        "valid-replication-keys": []
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "airline"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "airlineid"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "destinationairport"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "distance"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "equipment"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "id"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "schedule"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "sourceairport"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "stops"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                },
                                {
                                    "breadcrumb": (
                                        "properties",
                                        "type"
                                    ),
                                    "metadata": {
                                        "inclusion": "available"
                                    }
                                }
                            ],
                            "replication_key": "",
                            "replication_method": "FULL_TABLE",
                            "schema": {
                                "properties": {
                                    "airline": {
                                        "type": ["null", "string"]
                                    },
                                    "airlineid": {
                                        "type": ["null", "string"]
                                    },
                                    "destinationairport": {
                                        "type": ["null", "string"]
                                    },
                                    "distance": {
                                        "type": ["null", "number"]
                                    },
                                    "equipment": {
                                        "type": ["null", "string"]
                                    },
                                    "id": {
                                        "type": ["null", "number"]
                                    },
                                    "schedule": {
                                        "type": ["null", "array"]
                                    },
                                    "sourceairport": {
                                        "type": ["null", "string"]
                                    },
                                    "stops": {
                                        "type": ["null", "number"]
                                    },
                                    "type": {
                                        "type": ["null", "string"]
                                    }
                                },
                                "type": "object"
                            },
                            "stream": "route",
                            "tap_stream_id": "route"
                        }
                    ]
                },
                catalog.to_dict()
            )

'''
