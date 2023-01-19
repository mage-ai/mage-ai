import unittest
from unittest import mock
from unittest.mock import Mock
from tap_facebook import FacebookRequestError
from tap_facebook import AdCreative, Leads
from singer import resolve_schema_references
from singer.schema import Schema
from singer.catalog import CatalogEntry

# Mock object for the batch object to raise exception
class MockBatch:

    def __init__(self, exception="NoException"):
        self.exception = exception

    def execute(self):
        if self.exception == "AttributeError":
            raise AttributeError("'str' object has no attribute 'get'")
        elif self.exception == "FacebookRequestError":
            raise FacebookRequestError(
                        message='',
                        request_context={"":Mock()},
                        http_status=500,
                        http_headers=Mock(),
                        body={}
                    )

class TestAdCreativeSyncBbatches(unittest.TestCase):

    @mock.patch("tap_facebook.API")
    @mock.patch("singer.resolve_schema_references")
    def test_retries_on_attribute_error_sync_batches(self, mocked_schema, mocked_api):
        """ 
            AdCreative.sync_batches calls a `facebook_business` method,`api_batch.execute()`, to get a batch of ad creatives. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """
        # Mock new_batch() function of API
        mocked_api.new_batch = Mock()
        mocked_api.new_batch.return_value = MockBatch(exception="AttributeError") # Raise AttributeError exception

        # Initialize AdCreative and mock catalog_entry
        mock_catalog_entry = CatalogEntry(schema=Schema())
        ad_creative_object = AdCreative('', '', '', '')
        ad_creative_object.catalog_entry = mock_catalog_entry

        # Call sync_batches() function of AdCreatives and verify AttributeError is raised
        with self.assertRaises(AttributeError):
            ad_creative_object.sync_batches([])

        # verify calls inside sync_batches are called 5 times as max 5 retries provided for function
        self.assertEquals(5, mocked_api.new_batch.call_count)
        self.assertEquals(5, mocked_schema.call_count)

    @mock.patch("tap_facebook.API")
    @mock.patch("singer.resolve_schema_references")
    def test_retries_on_facebook_request_error_sync_batches(self, mocked_schema, mocked_api):
        """ 
            AdCreative.sync_batches calls a `facebook_business` method,`api_batch.execute()`, to get a batch of ad creatives. 
            We mock this method to raise a `FacebookRequestError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """
        # Mock new_batch() function of API
        mocked_api.new_batch = Mock()
        mocked_api.new_batch.return_value = MockBatch(exception="FacebookRequestError") # Raise FacebookRequestError exception

        # Initialize AdCreative and mock catalog_entry
        mock_catalog_entry = CatalogEntry(schema=Schema())
        ad_creative_object = AdCreative('', '', '', '')
        ad_creative_object.catalog_entry = mock_catalog_entry

        # Call sync_batches() function of AdCreatives and verify FacebookRequestError is raised
        with self.assertRaises(FacebookRequestError):
            ad_creative_object.sync_batches([])

        # verify calls inside sync_batches are called 5 times as max 5 reties provided for function
        self.assertEquals(5, mocked_api.new_batch.call_count)
        self.assertEquals(5, mocked_schema.call_count)

    @mock.patch("tap_facebook.API")
    @mock.patch("singer.resolve_schema_references")
    def test_no_error_on_sync_batches(self, mocked_schema, mocked_api):
        """ 
            AdCreative.sync_batches calls a `facebook_business` method,`api_batch.execute()`, to get a batch of ad creatives. 
            We mock this method to simply pass the things and expect the tap to run without exception
        """
        # Mock new_batch() function of API
        mocked_api.new_batch = Mock()
        mocked_api.new_batch.return_value = MockBatch() # No exception

        # Initialize AdCreative and mock catalog_entry
        mock_catalog_entry = CatalogEntry(schema=Schema())
        ad_creative_object = AdCreative('', '', '', '')
        ad_creative_object.catalog_entry = mock_catalog_entry

        # Call sync_batches() function of AdCreatives
        ad_creative_object.sync_batches([])

        # verify calls inside sync_batches are called once as no exception is thrown
        self.assertEquals(1, mocked_api.new_batch.call_count)
        self.assertEquals(1, mocked_schema.call_count)


class TestLeadsSyncBatches(unittest.TestCase):

    @mock.patch("tap_facebook.API")
    @mock.patch("singer.resolve_schema_references")
    def test_retries_on_attribute_error_sync_batches(self, mocked_schema, mocked_api):
        """ 
            Leads.sync_batches calls a `facebook_business` method,`api_batch.execute()`, to get a batch of Leads. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """
        # Mock new_batch() function of API
        mocked_api.new_batch = Mock()
        mocked_api.new_batch.return_value = MockBatch(exception="AttributeError") # Raise AttributeError exception

        # Initialize Leads and mock catalog_entry
        mock_catalog_entry = CatalogEntry(schema=Schema())
        leads_object = Leads('', '', '', '', '')
        leads_object.catalog_entry = mock_catalog_entry

        # Call sync_batches() function of Leads and verify AttributeError is raised
        with self.assertRaises(AttributeError):
            leads_object.sync_batches([])

        # verify calls inside sync_batches are called 5 times as max 5 reties provided for function
        self.assertEquals(5, mocked_api.new_batch.call_count)
        self.assertEquals(5, mocked_schema.call_count)

    @mock.patch("tap_facebook.API")
    @mock.patch("singer.resolve_schema_references")
    def test_retries_on_facebook_request_error_sync_batches(self, mocked_schema, mocked_api):
        """ 
            Leads.sync_batches calls a `facebook_business` method,`api_batch.execute()`, to get a batch of Leads. 
            We mock this method to raise a `FacebookRequestError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """
        # Mock new_batch() function of API
        mocked_api.new_batch = Mock()
        mocked_api.new_batch.return_value = MockBatch(exception="FacebookRequestError") # Raise FacebookRequestError exception

        # Initialize Leads and mock catalog_entry
        mock_catalog_entry = CatalogEntry(schema=Schema())
        leads_object = Leads('', '', '', '', '')
        leads_object.catalog_entry = mock_catalog_entry

        # Call sync_batches() function of Leads and verify FacebookRequestError is raised
        with self.assertRaises(FacebookRequestError):
            leads_object.sync_batches([])

        # verify calls inside sync_batches are called 5 times as max 5 reties provided for function
        self.assertEquals(5, mocked_api.new_batch.call_count)
        self.assertEquals(5, mocked_schema.call_count)
