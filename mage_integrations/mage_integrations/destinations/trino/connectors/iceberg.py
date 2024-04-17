"""
Trino iceberg connector
"""

from mage_integrations.destinations.trino.connectors.deltalake import (  # noqa: F401
    TrinoDeltalake,
    convert_column_type,
)


class TrinoIceberg(TrinoDeltalake):
    """
    As of Apr 17 2024, there is no difference between iceberg and delta-lake connectors
    which is why we are inheriting from TrinoDeltalake.

    Any changes that are not common between iceberg and delta-lake connectors
    should be implemented in this class.
    """
    name = 'iceberg'
