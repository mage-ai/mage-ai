"""Test tap check mode and metadata/annotated-schema."""
import re

from tap_tester import menagerie, connections, runner

from base import FreshdeskBaseTest


class FreshdeskCheckTest(FreshdeskBaseTest):
    """Test tap check  mode and metadata/annotated-schema conforms to standards."""

    @staticmethod
    def name():
        return "tt_freshdesk_check"

    def test_run(self):
        """
        Freshdesk check test (does not run discovery).
        Verify that check does NOT create a discovery catalog, schema, metadata, etc.

        • Verify check job does not populate found_catalogs
        • Verify no critical errors are thrown for check job
        """
        streams_to_test = self.expected_streams()

        conn_id = connections.ensure_connection(self)

        # Run and verify the check, see base.py for details
        self.run_and_verify_check_mode(conn_id)
