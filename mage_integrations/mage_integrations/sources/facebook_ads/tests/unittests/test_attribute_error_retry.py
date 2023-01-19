import unittest
from unittest.mock import Mock
from unittest import mock
from tap_facebook import AdCreative, Ads, AdSets, Campaigns, AdsInsights, Leads

@mock.patch("time.sleep")
class TestAttributErrorBackoff(unittest.TestCase):
    """A set of unit tests to ensure that requests are retrying properly for AttributeError Error"""
    def test_get_adcreatives(self, mocked_sleep):
        """ 
            AdCreative.get_adcreatives calls a `facebook_business` method,`get_ad_creatives()`, to get a batch of ad creatives. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_ad_creatives function to throw AttributeError exception
        mocked_account = Mock()
        mocked_account.get_ad_creatives = Mock()
        mocked_account.get_ad_creatives.side_effect = AttributeError

        # Call get_adcreatives() function of AdCreatives and verify AttributeError is raised
        ad_creative_object = AdCreative('', mocked_account, '', '')
        with self.assertRaises(AttributeError):
            ad_creative_object.get_adcreatives()

        # verify get_ad_creatives() is called 5 times as max 5 reties provided for function
        self.assertEquals(mocked_account.get_ad_creatives.call_count, 5)

    def test_call_get_ads(self, mocked_sleep):
        """ 
            Ads._call_get_ads calls a `facebook_business` method,`get_ads()`, to get a batch of ads. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_ads function to throw AttributeError exception
        mocked_account = Mock()
        mocked_account.get_ads = Mock()
        mocked_account.get_ads.side_effect = AttributeError

        # Call _call_get_ads() function of Ads and verify AttributeError is raised
        ad_object = Ads('', mocked_account, '', '', '')
        with self.assertRaises(AttributeError):
            ad_object._call_get_ads('test')

        # verify get_ads() is called 5 times as max 5 reties provided for function
        self.assertEquals(mocked_account.get_ads.call_count, 5)

    @mock.patch("pendulum.parse")
    def test_ad_prepare_record(self, mocked_parse, mocked_sleep):
        """ 
            __iter__ of Ads calls a function _iterate which calls a nested prepare_record function.
            Prepare_record calls a `facebook_business` method,`ad.api_get()`, to get a ad fields. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """
        # Mock ad object
        mocked_ad = Mock()
        mocked_ad.api_get = Mock()
        mocked_ad.__getitem__ = Mock()
        mocked_ad.api_get.side_effect = AttributeError

        # # Mock get_ads function return mocked ad object
        mocked_account = Mock()
        mocked_account.get_ads = Mock()
        mocked_account.get_ads.side_effect = [[mocked_ad]]

        # Iterate ads object which calls prepare_record() inside and verify AttributeError is raised
        ad_object = Ads('', mocked_account, '', '', '')
        with self.assertRaises(AttributeError):
            for message in ad_object:
                pass

        # verify prepare_record() function by checking call count of mocked ad.api_get()
        self.assertEquals(mocked_ad.api_get.call_count, 5)

    def test__call_get_ad_sets(self, mocked_sleep):
        """ 
            AdSets._call_get_ad_sets calls a `facebook_business` method,`get_ad_sets()`, to get a batch of adsets. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_ad_sets function to throw AttributeError exception
        mocked_account = Mock()
        mocked_account.get_ad_sets = Mock()
        mocked_account.get_ad_sets.side_effect = AttributeError

        # Call _call_get_ad_sets() function of AdSets and verify AttributeError is raised
        ad_set_object = AdSets('', mocked_account, '', '', '')
        with self.assertRaises(AttributeError):
            ad_set_object._call_get_ad_sets('test')

        # verify get_ad_sets() is called 5 times as max 5 reties provided for function
        self.assertEquals(mocked_account.get_ad_sets.call_count, 5)

    @mock.patch("pendulum.parse")
    def test_adset_prepare_record(self, mocked_parse, mocked_sleep):
        """ 
            __iter__ of AdSets calls a function _iterate which calls a nested prepare_record function.
            Prepare_record calls a `facebook_business` method,`ad.api_get()`, to get a ad fields. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock adset object
        mocked_adset = Mock()
        mocked_adset.api_get = Mock()
        mocked_adset.__getitem__ = Mock()
        mocked_adset.api_get.side_effect = AttributeError

        # Mock get_ad_sets function return mocked ad object
        mocked_account = Mock()
        mocked_account.get_ad_sets = Mock()
        mocked_account.get_ad_sets.side_effect = [[mocked_adset]]

        # Iterate adset object which calls prepare_record() inside and verify AttributeError is raised
        ad_set_object = AdSets('', mocked_account, '', '', '')
        with self.assertRaises(AttributeError):
            for message in ad_set_object:
                pass

        # verify prepare_record() function by checking call count of mocked ad.api_get()
        self.assertEquals(mocked_adset.api_get.call_count, 5)

    def test__call_get_campaigns(self, mocked_sleep):
        """ 
            Campaigns._call_get_campaigns calls a `facebook_business` method,`get_campaigns()`, to get a batch of campaigns. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_campaigns function to throw AttributeError exception
        mocked_account = Mock()
        mocked_account.get_campaigns = Mock()
        mocked_account.get_campaigns.side_effect = AttributeError

        # Call _call_get_campaigns() function of Campaigns and verify AttributeError is raised
        campaigns_object = Campaigns('', mocked_account, '', '', '')
        with self.assertRaises(AttributeError):
            campaigns_object._call_get_campaigns('test')

        # verify get_campaigns() is called 5 times as max 5 reties provided for function
        self.assertEquals(mocked_account.get_campaigns.call_count, 5)

    @mock.patch("pendulum.parse")
    def test_campaign_prepare_record(self, mocked_parse, mocked_sleep):
        """ 
            __iter__ of Campaigns calls a function _iterate which calls a nested prepare_record function.
            Prepare_record calls a `facebook_business` method,`ad.api_get()`, to get a ad fields. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # # Mock campaign object
        mocked_campaign = Mock()
        mocked_campaign.api_get = Mock()
        mocked_campaign.__getitem__ = Mock()
        mocked_campaign.api_get.side_effect = AttributeError

        # # Mock get_campaigns function return mocked ad object
        mocked_account = Mock()
        mocked_account.get_campaigns = Mock()
        mocked_account.get_campaigns.side_effect = [[mocked_campaign]]

        # Iterate campaigns object which calls prepare_record() inside and verify AttributeError is raised
        campaign_object = Campaigns('', mocked_account, '', '', '')
        with self.assertRaises(AttributeError):
            for message in campaign_object:
                pass

        # verify prepare_record() function by checking call count of mocked ad.api_get()
        self.assertEquals(mocked_campaign.api_get.call_count, 5)

    def test_run_job(self, mocked_sleep):
        """ 
            AdsInsights.run_job calls a `facebook_business` method,`get_insights()`, to get a batch of insights. 
            We mock this method to raise a `AttributeError` and expect the tap to retry this that function up to 5 times,
            which is the current hard coded `max_tries` value.
        """

        # Mock get_insights function to throw AttributeError exception
        mocked_account = Mock()
        mocked_account.get_insights = Mock()
        mocked_account.get_insights.side_effect = AttributeError

        # Call run_job() function of Campaigns and verify AttributeError is raised
        ads_insights_object = AdsInsights('', mocked_account, '', '', '', {})
        with self.assertRaises(AttributeError):
            ads_insights_object.run_job('test')

        # verify get_insights() is called 5 times as max 5 reties provided for function
        self.assertEquals(mocked_account.get_insights.call_count, 5)
