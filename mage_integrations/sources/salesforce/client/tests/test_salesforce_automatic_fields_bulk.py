"""
Test that with no fields selected for a stream automatic fields are still replicated
"""
import unittest
from datetime import datetime, timedelta

from tap_tester import runner, connections

from test_salesforce_automatic_fields_rest import SalesforceAutomaticFields


class SalesforceAutomaticFieldsBulk(SalesforceAutomaticFields):
    """Test that with no fields selected for a stream automatic fields are still replicated"""

    salesforce_api = 'BULK'

    @staticmethod
    def name():
        return "tt_salesforce_auto_bulk"

    def test_run(self):
        self.automatic_fields_test()
