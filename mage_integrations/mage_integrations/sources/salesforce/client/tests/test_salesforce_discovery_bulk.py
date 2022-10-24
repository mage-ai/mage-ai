"""Test tap discovery mode and metadata/annotated-schema."""
import unittest
from tap_tester import menagerie, connections

from test_salesforce_discovery_rest import DiscoveryTest


class DiscoveryTestBulk(DiscoveryTest):
    """Test tap discovery mode with the BULK API selected"""

    @staticmethod
    def name():
        return "tt_salesforce_disco_bulk"

    def test_discovery(self):
        self.salesforce_api = 'BULK'
        self.discovery_test()
