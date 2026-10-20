import unittest
from unittest import mock
import tap_linkedin_ads.sync as sync
from tap_linkedin_ads.client import LinkedinClient


@mock.patch("tap_linkedin_ads.sync.LOGGER.warning")
class TestSyncEndpoint(unittest.TestCase):
    

    @mock.patch("tap_linkedin_ads.sync.get_bookmark")
    @mock.patch("tap_linkedin_ads.sync.should_sync_stream")
    @mock.patch("tap_linkedin_ads.client.LinkedinClient.get")
    @mock.patch("tap_linkedin_ads.sync.process_records")
    @mock.patch("tap_linkedin_ads.sync.get_selected_streams")
    @mock.patch("tap_linkedin_ads.sync.write_schema")
    def test_sync_endpoint_for_reference_organization_id_is_None(self,mock_write_schema,mock_get_selected_streams,mock_process_records,mock_client,mock_should_sync_stream,mock_get_bookmark,mocked_logger):
        
        client=LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        catalog = None
        state={'currently_syncing': 'accounts'}
        start_date='2019-06-01T00:00:00Z'
        stream_name='accounts'
        path='adDirectSponsoredContents'
        endpoint_config={'path':'adAccountsV2','account_filter':'search_id_values_param','params':{'q':'search','sort.field':'ID','sort.order':'ASCENDING'},'data_key':'elements','bookmark_field':'last_modified_time','id_fields':['id','reference_organization_id'],'children':{'video_ads':{'path':'adDirectSponsoredContents','account_filter':None,'params':{'q':'account'},'data_key':'elements','bookmark_field':'last_modified_time','id_fields':['content_reference']}}}
        data_key='elements'
        static_params={'q': 'account', 'account': 'urn:li:sponsoredAccount:111111111', 'owner': 'urn:li:organization:20111635'}
        bookmark_field='last_modified_time'
        id_fields=['content_reference']
        parent=None
        parent_id=111111111
        
        mock_client.return_value = {'paging': {'start': 0, 'count': 100, 'links': [], 'total': 1}, 'elements': [{'owner': 'urn:li:organization:22222222', 'changeAuditStamps': {'created': {'time': 1564585620000}, 'lastModified': {'time': 1564585620000}}, 'contentReference': '111111111', 'name': 'Stitch Tableau', 'type': 'VIDEO', 'account': 'urn:li:sponsoredAccount:111111111', 'status': 'ACTIVE'}]}
        mock_process_records.return_value = "2019-07-31T15:07:00.000000Z",1
        mock_should_sync_stream.return_value = True, ""
        mock_get_selected_streams.return_value = ['video_ads', 'accounts']

        sync.sync_endpoint(client,catalog,state,start_date,stream_name,path,endpoint_config,data_key,static_params,bookmark_field=bookmark_field,id_fields=id_fields,parent=parent,parent_id=parent_id)

        account = 'urn:li:sponsoredAccount:111111111'

        mocked_logger.assert_called_with('Skipping video_ads call for %s account as reference_organization_id is not found.',account)