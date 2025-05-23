import unittest
import tap_facebook
from unittest.mock import Mock
from unittest import mock
from requests.exceptions import ConnectionError, Timeout
from tap_facebook import AdCreative, Ads, AdSets, Campaigns, AdsInsights, Leads

@mock.patch("time.sleep")
class TestRequestTimeoutBackoff(unittest.TestCase):
    """A set of unit tests to ensure that requests are retrying properly for Timeout Error"""
    def test_get_adcreatives(self, mocked_sleep):
        """ 
            AdCreative.get_adcreatives calls a `facebook_business` method,`get_ad_creatives()`, to get a batch of ad creatives. 
            We mock this method to raise a `Timeout` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_ad_creatives function to throw Timeout exception
        mocked_account = Mock()
        mocked_account.get_ad_creatives = Mock()
        mocked_account.get_ad_creatives.side_effect = Timeout

        # Call get_adcreatives() function of AdCreatives and verify Timeout is raised
        ad_creative_object = AdCreative('', mocked_account, '', '')
        with self.assertRaises(Timeout):
            ad_creative_object.get_adcreatives()

        # verify get_ad_creatives() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_ad_creatives.call_count, 5)

    def test__call_get_ads(self, mocked_sleep):
        """ 
            Ads._call_get_ads calls a `facebook_business` method,`get_ads()`, to get a batch of ads. 
            We mock this method to raise a `Timeout` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_ads function to throw Timeout exception
        mocked_account = Mock()
        mocked_account.get_ads = Mock()
        mocked_account.get_ads.side_effect = Timeout

        # Call _call_get_ads() function of Ads and verify Timeout is raised
        ad_object = Ads('', mocked_account, '', '', '')
        with self.assertRaises(Timeout):
            ad_object._call_get_ads('test')

        # verify get_ads() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_ads.call_count, 5)

    @mock.patch("pendulum.parse")
    def test_ad_prepare_record(self, mocked_parse, mocked_sleep):
        """ 
            __iter__ of Ads calls a function _iterate which calls a nested prepare_record function.
            Prepare_record calls a `facebook_business` method,`ad.api_get()`, to get a ad fields. 
            We mock this method to raise a `Timeout` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """
        # Mock ad object
        mocked_ad = Mock()
        mocked_ad.api_get = Mock()
        mocked_ad.__getitem__ = Mock()
        mocked_ad.api_get.side_effect = Timeout

        # # Mock get_ads function return mocked ad object
        mocked_account = Mock()
        mocked_account.get_ads = Mock()
        mocked_account.get_ads.side_effect = [[mocked_ad]]

        # Iterate ads object which calls prepare_record() inside and verify Timeout is raised
        ad_object = Ads('', mocked_account, '', '', '')
        with self.assertRaises(Timeout):
            for message in ad_object:
                pass

        # verify prepare_record() function by checking call count of mocked ad.api_get()
        self.assertEqual(mocked_ad.api_get.call_count, 5)

    def test__call_get_ad_sets(self, mocked_sleep):
        """ 
            AdSets._call_get_ad_sets calls a `facebook_business` method,`get_ad_sets()`, to get a batch of adsets. 
            We mock this method to raise a `Timeout` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_ad_sets function to throw Timeout exception
        mocked_account = Mock()
        mocked_account.get_ad_sets = Mock()
        mocked_account.get_ad_sets.side_effect = Timeout

        # Call _call_get_ad_sets() function of AdSets and verify Timeout is raised
        ad_set_object = AdSets('', mocked_account, '', '', '')
        with self.assertRaises(Timeout):
            ad_set_object._call_get_ad_sets('test')

        # verify get_ad_sets() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_ad_sets.call_count, 5)

    @mock.patch("pendulum.parse")
    def test_adset_prepare_record(self, mocked_parse, mocked_sleep):
        """ 
            __iter__ of AdSets calls a function _iterate which calls a nested prepare_record function.
            Prepare_record calls a `facebook_business` method,`ad.api_get()`, to get a ad fields. 
            We mock this method to raise a `Timeout` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock adset object
        mocked_adset = Mock()
        mocked_adset.api_get = Mock()
        mocked_adset.__getitem__ = Mock()
        mocked_adset.api_get.side_effect = Timeout

        # Mock get_ad_sets function return mocked ad object
        mocked_account = Mock()
        mocked_account.get_ad_sets = Mock()
        mocked_account.get_ad_sets.side_effect = [[mocked_adset]]

        # Iterate adset object which calls prepare_record() inside and verify Timeout is raised
        ad_set_object = AdSets('', mocked_account, '', '', '')
        with self.assertRaises(Timeout):
            for message in ad_set_object:
                pass

        # verify prepare_record() function by checking call count of mocked ad.api_get()
        self.assertEqual(mocked_adset.api_get.call_count, 5)

    def test__call_get_campaigns(self, mocked_sleep):
        """ 
            Campaigns._call_get_campaigns calls a `facebook_business` method,`get_campaigns()`, to get a batch of campaigns. 
            We mock this method to raise a `Timeout` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_campaigns function to throw Timeout exception
        mocked_account = Mock()
        mocked_account.get_campaigns = Mock()
        mocked_account.get_campaigns.side_effect = Timeout

        # Call _call_get_campaigns() function of Campaigns and verify Timeout is raised
        campaigns_object = Campaigns('', mocked_account, '', '', '')
        with self.assertRaises(Timeout):
            campaigns_object._call_get_campaigns('test')

        # verify get_campaigns() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_campaigns.call_count, 5)

    @mock.patch("pendulum.parse")
    def test_campaign_prepare_record(self, mocked_parse, mocked_sleep):
        """ 
            __iter__ of Campaigns calls a function _iterate which calls a nested prepare_record function.
            Prepare_record calls a `facebook_business` method,`ad.api_get()`, to get a ad fields. 
            We mock this method to raise a `Timeout` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # # Mock campaign object
        mocked_campaign = Mock()
        mocked_campaign.api_get = Mock()
        mocked_campaign.__getitem__ = Mock()
        mocked_campaign.api_get.side_effect = Timeout

        # # Mock get_campaigns function return mocked ad object
        mocked_account = Mock()
        mocked_account.get_campaigns = Mock()
        mocked_account.get_campaigns.side_effect = [[mocked_campaign]]

        # Iterate campaigns object which calls prepare_record() inside and verify Timeout is raised
        campaign_object = Campaigns('', mocked_account, '', '', '')
        with self.assertRaises(Timeout):
            for message in campaign_object:
                pass

        # verify prepare_record() function by checking call count of mocked ad.api_get()
        self.assertEqual(mocked_campaign.api_get.call_count, 5)

    def test_run_job(self, mocked_sleep):
        """ 
            AdsInsights.run_job calls a `facebook_business` method,`get_insights()`, to get a batch of insights. 
            We mock this method to raise a `Timeout` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_insights function to throw Timeout exception
        mocked_account = Mock()
        mocked_account.get_insights = Mock()
        mocked_account.get_insights.side_effect = Timeout

        # Call run_job() function of Campaigns and verify Timeout is raised
        ads_insights_object = AdsInsights('', mocked_account, '', '', '', {})
        with self.assertRaises(Timeout):
            ads_insights_object.run_job('test')

        # verify get_insights() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_insights.call_count, 5)

@mock.patch("time.sleep")
class TestConnectionErrorBackoff(unittest.TestCase):
    """A set of unit tests to ensure that requests are retrying properly for ConnectionError Error"""
    def test_get_adcreatives(self, mocked_sleep):
        """ 
            AdCreative.get_adcreatives calls a `facebook_business` method,`get_ad_creatives()`, to get a batch of ad creatives. 
            We mock this method to raise a `ConnectionError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_ad_creatives function to throw ConnectionError exception
        mocked_account = Mock()
        mocked_account.get_ad_creatives = Mock()
        mocked_account.get_ad_creatives.side_effect = ConnectionError

        # Call get_adcreatives() function of AdCreatives and verify ConnectionError is raised
        ad_creative_object = AdCreative('', mocked_account, '', '')
        with self.assertRaises(ConnectionError):
            ad_creative_object.get_adcreatives()

        # verify get_ad_creatives() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_ad_creatives.call_count, 5)

    def test__call_get_ads(self, mocked_sleep):
        """ 
            Ads._call_get_ads calls a `facebook_business` method,`get_ads()`, to get a batch of ads. 
            We mock this method to raise a `ConnectionError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_ads function to throw ConnectionError exception
        mocked_account = Mock()
        mocked_account.get_ads = Mock()
        mocked_account.get_ads.side_effect = ConnectionError

        # Call _call_get_ads() function of Ads and verify ConnectionError is raised
        ad_object = Ads('', mocked_account, '', '', '')
        with self.assertRaises(ConnectionError):
            ad_object._call_get_ads('test')

        # verify get_ads() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_ads.call_count, 5)

    @mock.patch("pendulum.parse")
    def test_ad_prepare_record(self, mocked_parse, mocked_sleep):
        """ 
            __iter__ of Ads calls a function _iterate which calls a nested prepare_record function.
            Prepare_record calls a `facebook_business` method,`ad.api_get()`, to get a ad fields. 
            We mock this method to raise a `ConnectionError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """
        # Mock ad object
        mocked_ad = Mock()
        mocked_ad.api_get = Mock()
        mocked_ad.__getitem__ = Mock()
        mocked_ad.api_get.side_effect = ConnectionError

        # # Mock get_ads function return mocked ad object
        mocked_account = Mock()
        mocked_account.get_ads = Mock()
        mocked_account.get_ads.side_effect = [[mocked_ad]]

        # Iterate ads object which calls prepare_record() inside and verify ConnectionError is raised
        ad_object = Ads('', mocked_account, '', '', '')
        with self.assertRaises(ConnectionError):
            for message in ad_object:
                pass

        # verify prepare_record() function by checking call count of mocked ad.api_get()
        self.assertEqual(mocked_ad.api_get.call_count, 5)

    def test__call_get_ad_sets(self, mocked_sleep):
        """ 
            AdSets._call_get_ad_sets calls a `facebook_business` method,`get_ad_sets()`, to get a batch of adsets. 
            We mock this method to raise a `ConnectionError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_ad_sets function to throw ConnectionError exception
        mocked_account = Mock()
        mocked_account.get_ad_sets = Mock()
        mocked_account.get_ad_sets.side_effect = ConnectionError

        # Call _call_get_ad_sets() function of AdSets and verify ConnectionError is raised
        ad_set_object = AdSets('', mocked_account, '', '', '')
        with self.assertRaises(ConnectionError):
            ad_set_object._call_get_ad_sets('test')

        # verify get_ad_sets() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_ad_sets.call_count, 5)

    @mock.patch("pendulum.parse")
    def test_adset_prepare_record(self, mocked_parse, mocked_sleep):
        """ 
            __iter__ of AdSets calls a function _iterate which calls a nested prepare_record function.
            Prepare_record calls a `facebook_business` method,`ad.api_get()`, to get a ad fields. 
            We mock this method to raise a `ConnectionError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock adset object
        mocked_adset = Mock()
        mocked_adset.api_get = Mock()
        mocked_adset.__getitem__ = Mock()
        mocked_adset.api_get.side_effect = ConnectionError

        # Mock get_ad_sets function return mocked ad object
        mocked_account = Mock()
        mocked_account.get_ad_sets = Mock()
        mocked_account.get_ad_sets.side_effect = [[mocked_adset]]

        # Iterate adset object which calls prepare_record() inside and verify ConnectionError is raised
        ad_set_object = AdSets('', mocked_account, '', '', '')
        with self.assertRaises(ConnectionError):
            for message in ad_set_object:
                pass

        # verify prepare_record() function by checking call count of mocked ad.api_get()
        self.assertEqual(mocked_adset.api_get.call_count, 5)

    def test__call_get_campaigns(self, mocked_sleep):
        """ 
            Campaigns._call_get_campaigns calls a `facebook_business` method,`get_campaigns()`, to get a batch of campaigns. 
            We mock this method to raise a `ConnectionError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_campaigns function to throw ConnectionError exception
        mocked_account = Mock()
        mocked_account.get_campaigns = Mock()
        mocked_account.get_campaigns.side_effect = ConnectionError

        # Call _call_get_campaigns() function of Campaigns and verify ConnectionError is raised
        campaigns_object = Campaigns('', mocked_account, '', '', '')
        with self.assertRaises(ConnectionError):
            campaigns_object._call_get_campaigns('test')

        # verify get_campaigns() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_campaigns.call_count, 5)

    @mock.patch("pendulum.parse")
    def test_campaign_prepare_record(self, mocked_parse, mocked_sleep):
        """ 
            __iter__ of Campaigns calls a function _iterate which calls a nested prepare_record function.
            Prepare_record calls a `facebook_business` method,`ad.api_get()`, to get a ad fields. 
            We mock this method to raise a `ConnectionError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # # Mock campaign object
        mocked_campaign = Mock()
        mocked_campaign.api_get = Mock()
        mocked_campaign.__getitem__ = Mock()
        mocked_campaign.api_get.side_effect = ConnectionError

        # # Mock get_campaigns function return mocked ad object
        mocked_account = Mock()
        mocked_account.get_campaigns = Mock()
        mocked_account.get_campaigns.side_effect = [[mocked_campaign]]

        # Iterate campaigns object which calls prepare_record() inside and verify ConnectionError is raised
        campaign_object = Campaigns('', mocked_account, '', '', '')
        with self.assertRaises(ConnectionError):
            for message in campaign_object:
                pass

        # verify prepare_record() function by checking call count of mocked ad.api_get()
        self.assertEqual(mocked_campaign.api_get.call_count, 5)

    def test_run_job(self, mocked_sleep):
        """ 
            AdsInsights.run_job calls a `facebook_business` method,`get_insights()`, to get a batch of insights. 
            We mock this method to raise a `ConnectionError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_insights function to throw ConnectionError exception
        mocked_account = Mock()
        mocked_account.get_insights = Mock()
        mocked_account.get_insights.side_effect = ConnectionError

        # Call run_job() function of Campaigns and verify ConnectionError is raised
        ads_insights_object = AdsInsights('', mocked_account, '', '', '', {})
        with self.assertRaises(ConnectionError):
            ads_insights_object.run_job('test')

        # verify get_insights() is called 5 times as max 5 reties provided for function
        self.assertEqual(mocked_account.get_insights.call_count, 5)


# Mock args
class Args():
    def __init__(self, config):
        self.config = config
        self.discover = False
        self.properties = False
        self.catalog = False
        self.state = False

@mock.patch('tap_facebook.utils.parse_args')
@mock.patch("tap_facebook.FacebookAdsApi.init")
@mock.patch("tap_facebook.fb_user.User")
class TestRequestTimeoutValue(unittest.TestCase):
    """A set of unit tests to ensure that request timeout is set based on config or default value"""

    def test_default_value_request_timeout(self, mocked_user, mocked_facebook_api, mocked_args):
        """ 
            unit tests to ensure that request timeout is set based on config or default value
        """
        tap_facebook.CONFIG = {}
        config = {'account_id': 'test', 'access_token': 'test'} # No request_timeout in config
        mocked_args.return_value = Args(config)

        # Mock fb_user and get_add_accounts
        mocked_fb_user = Mock()
        mocked_fb_user.get_ad_accounts = Mock()
        mocked_fb_user.get_ad_accounts.return_value = [{'account_id': 'test'}]
        mocked_user.return_value = mocked_fb_user

        # Call main_impl function which initialize FacebookAdsApi with timeout
        tap_facebook.main_impl()

        # verify that FacebookAdsApi.init() called with default timeout
        mocked_facebook_api.assert_called_with(access_token='test', timeout=300)

    def test_config_provided_int_request_timeout(self, mocked_user, mocked_facebook_api, mocked_args):
        """ 
            unit tests to ensure that request timeout is set based on config(integer value)
        """
        tap_facebook.CONFIG = {}
        # request_timeout provided in config with 100(integer)
        config = {'account_id': 'test', 'access_token': 'test', 'request_timeout': 100}
        mocked_args.return_value = Args(config)

        # Mock fb_user and get_add_accounts
        mocked_fb_user = Mock()
        mocked_fb_user.get_ad_accounts = Mock()
        mocked_fb_user.get_ad_accounts.return_value = [{'account_id': 'test'}]
        mocked_user.return_value = mocked_fb_user

        # Call main_impl function which initialize FacebookAdsApi with timeout
        tap_facebook.main_impl()

        # verify that FacebookAdsApi.init() called with timeout provided in config
        mocked_facebook_api.assert_called_with(access_token='test', timeout=100)

    def test_config_provided_float_request_timeout(self, mocked_user, mocked_facebook_api, mocked_args):
        """ 
            unit tests to ensure that request timeout is set based on config(float value)
        """
        tap_facebook.CONFIG = {}
        # request_timeout provided in config with 100.5(float)
        config = {'account_id': 'test', 'access_token': 'test', 'request_timeout': 100.5}
        mocked_args.return_value = Args(config)

        # Mock fb_user and get_add_accounts
        mocked_fb_user = Mock()
        mocked_fb_user.get_ad_accounts = Mock()
        mocked_fb_user.get_ad_accounts.return_value = [{'account_id': 'test'}]
        mocked_user.return_value = mocked_fb_user

        # Call main_impl function which initialize FacebookAdsApi with timeout
        tap_facebook.main_impl()

        # verify that FacebookAdsApi.init() called with timeout provided in config
        mocked_facebook_api.assert_called_with(access_token='test', timeout=100.5)

    def test_config_provided_string_request_timeout(self, mocked_user, mocked_facebook_api, mocked_args):
        """ 
            unit tests to ensure that request timeout is set based on config(string value)
        """
        tap_facebook.CONFIG = {}
        # request_timeout provided in config with 100(string)
        config = {'account_id': 'test', 'access_token': 'test', 'request_timeout': '100'}
        mocked_args.return_value = Args(config)

        # Mock fb_user and get_add_accounts
        mocked_fb_user = Mock()
        mocked_fb_user.get_ad_accounts = Mock()
        mocked_fb_user.get_ad_accounts.return_value = [{'account_id': 'test'}]
        mocked_user.return_value = mocked_fb_user

        # Call main_impl function which initialize FacebookAdsApi with timeout
        tap_facebook.main_impl()

        # verify that FacebookAdsApi.init() called with timeout provided in config
        mocked_facebook_api.assert_called_with(access_token='test', timeout=100)

    def test_config_provided_empty_request_timeout(self, mocked_user, mocked_facebook_api, mocked_args):
        """
            unit tests to ensure that request timeout is set based on default value as config file has empty string
        """
        tap_facebook.CONFIG = {}
        # request_timeout provided in config with empty string
        config = {'account_id': 'test', 'access_token': 'test', 'request_timeout': ''}
        mocked_args.return_value = Args(config)

        # Mock fb_user and get_add_accounts
        mocked_fb_user = Mock()
        mocked_fb_user.get_ad_accounts = Mock()
        mocked_fb_user.get_ad_accounts.return_value = [{'account_id': 'test'}]
        mocked_user.return_value = mocked_fb_user

        # Call main_impl function which initialize FacebookAdsApi with timeout
        tap_facebook.main_impl()

        # verify that FacebookAdsApi.init() called with default timeout
        mocked_facebook_api.assert_called_with(access_token='test', timeout=300)
