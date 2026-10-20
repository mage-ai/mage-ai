import itertools
import unittest
from unittest.mock import patch
import pendulum
import tap_facebook

from tap_facebook import AdsInsights
from singer.catalog import Catalog, CatalogEntry
from singer.schema import Schema
from singer.utils import strftime, parse_args
from singer import SingerDiscoveryError, SingerSyncError

class TestAdsInsights(unittest.TestCase):
    fake_catalog_entry = CatalogEntry(schema={'properties': {'something': {'type': 'object'}}},
                                       metadata=[{'breadcrumb': ('properties', 'something'),
                                                  'metadata': {'selected' : True}}])
    def test_insights_start_dates_adjust_if_outside_window(self):
        insights = AdsInsights(
            name='insights',
            account=None,
            stream_alias="insights",
            options={},
            catalog_entry=self.fake_catalog_entry,
            state={'bookmarks':{'insights': {'date_start': '2017-01-31'}}})
        params = list(itertools.islice(insights.job_params(), 5))
        expected_date = pendulum.today().subtract(months=AdsInsights.FACEBOOK_INSIGHTS_RETENTION_PERIOD)
        self.assertEqual(params[0]['time_ranges'],
                         [{'since': expected_date.to_date_string(),
                           'until': expected_date.to_date_string()}])

        expected_date = expected_date.add(days=4)
        self.assertEqual(params[4]['time_ranges'],
                         [{'since': expected_date.to_date_string(),
                           'until': expected_date.to_date_string()}])

    def test_insights_start_dates_adjust_if_inside_window(self):
        input_date = pendulum.today().subtract(months=1)
        expected_date = input_date.subtract(days=28)
        insights = AdsInsights(
            name='insights',
            account=None,
            stream_alias="insights",
            options={},
            catalog_entry=self.fake_catalog_entry,
            state={'bookmarks':{'insights': {'date_start': input_date.to_date_string()}}})
        params = list(itertools.islice(insights.job_params(), 5))


        self.assertEqual(params[0]['time_ranges'],
                         [{'since': expected_date.to_date_string(),
                           'until': expected_date.to_date_string()}])

        expected_date = expected_date.add(days=4)
        self.assertEqual(params[4]['time_ranges'],
                         [{'since': expected_date.to_date_string(),
                           'until': expected_date.to_date_string()}])

    def test_insights_job_params_stops(self):
        start_date = pendulum.today().subtract(days=2)
        insights = AdsInsights(
            name='insights',
            account=None,
            stream_alias="insights",
            options={},
            catalog_entry=self.fake_catalog_entry,
            state={'bookmarks':{'insights': {'date_start': start_date.to_date_string()}}})

        self.assertEqual(31, len(list(insights.job_params())))


class TestPrimaryKeyInclusion(unittest.TestCase):

    def test_primary_keys_automatically_included(self):
        streams = tap_facebook.initialize_streams_for_discovery() # Make this list for the key_properties
        catalog = tap_facebook.discover_schemas()['streams']
        for catalog_entry in catalog:
            streamObject = [stream for stream in streams if stream.name == catalog_entry['stream']][0]
            key_prop_breadcrumbs = {('properties', x) for x in streamObject.key_properties} # Enumerate the breadcrumbs for key properties
            for field in catalog_entry['metadata']: # Check that all key properties are automatic inclusion
                if field['breadcrumb'] in key_prop_breadcrumbs:
                    self.assertEqual(field['metadata']['inclusion'], 'automatic')

class TestGetStreamsToSync(unittest.TestCase):


    def test_getting_streams_to_sync(self):
        catalog_entry= {
            'streams': [
                {
                    'stream': 'adcreative',
                    'tap_stream_id': 'adcreative',
                    'schema': {},
                    'metadata': [{'breadcrumb': (),
                                  'metadata': {'selected': True}}]
                },
                {
                    'stream': 'ads',
                    'tap_stream_id': 'ads',
                    'schema': {},
                    'metadata': [{'breadcrumb': (),
                                  'metadata': {'selected': False}}]
                }
            ]
        }

        catalog = Catalog.from_dict(catalog_entry)

        streams_to_sync = tap_facebook.get_streams_to_sync(None, catalog, None)
        names_to_sync = [stream.name for stream in streams_to_sync]
        self.assertEqual(['adcreative'], names_to_sync)

class TestDateTimeParsing(unittest.TestCase):

    def test(self):
        dt       = '2016-07-07T15:46:48-0400'
        expected = '2016-07-07T19:46:48.000000Z'
        self.assertEqual(
            tap_facebook.transform_datetime_string(dt),
            expected)


def fake_args(is_discovery):
    from collections import namedtuple
    fake_args = namedtuple('args', 'config discover properties state')

    def wrapped_function(*args, **kwargs):
        return fake_args({'account_id': 123,
                          'access_token': 123},
                         is_discovery,
                         {'streams': []},
                         {})

    return wrapped_function

def get_fake_accounts(*args, **kwargs):
    return [{'account_id': 123}]

def fake_tap_run(*args, **kwargs):
    raise tap_facebook.FacebookError('this is a test')

class TestErrorHandling(unittest.TestCase):

    @patch('singer.utils.parse_args', fake_args(is_discovery=True))
    @patch('facebook_business.adobjects.user.User.get_ad_accounts', get_fake_accounts)
    @patch('tap_facebook.do_discover', fake_tap_run)
    def test_discovery(self):
        with self.assertRaises(SingerDiscoveryError):
            tap_facebook.main()

    @patch('singer.utils.parse_args', fake_args(is_discovery=False))
    @patch('facebook_business.adobjects.user.User.get_ad_accounts', get_fake_accounts)
    @patch('tap_facebook.do_sync', fake_tap_run)
    def test_sync(self):
        with self.assertRaises(SingerSyncError):
            tap_facebook.main()



if __name__ == '__main__':
    unittest.main()
