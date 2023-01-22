import datetime

import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner
from tap_tester import LOGGER

from base import HubspotBaseTest
from client import TestClient

def get_matching_actual_record_by_pk(expected_primary_key_dict, actual_records):
    ret_records = []
    can_save = True
    for record in actual_records:
        for key, value in expected_primary_key_dict.items():
            actual_value = record[key]
            if actual_value != value:
                can_save = False
                break
        if can_save:
            ret_records.append(record)
        can_save = True
    return ret_records

FIELDS_ADDED_BY_TAP = {
    # In 'contacts' streams 'versionTimeStamp' is not available in response of the second call.
    # In the 1st call, Tap retrieves records of all contacts and from those records, it collects vids(id of contact).
    # These records contain the versionTimestamp field.
    # In the 2nd call, vids collected from the 1st call will be used to retrieve the whole contact record.
    # Here, the records collected for detailed contact information do not contain the versionTimestamp field.
    # So, we add the versionTimestamp field(fetched from 1st call records) explicitly in the record of 2nd call.
    "contacts": { "versionTimestamp" }
}

KNOWN_EXTRA_FIELDS = {
    'deals': {
        # BUG_TDL-14993 | https://jira.talendforge.org/browse/TDL-14993
        #                 Has an value of object with key 'value' and value 'Null'
        'property_hs_date_entered_1258834',
    },
}

KNOWN_MISSING_FIELDS = {
    'contacts':{ # BUG https://jira.talendforge.org/browse/TDL-16016
        'property_hs_latest_source_data_2',
        'property_hs_latest_source',
        'property_hs_latest_source_data_1',
        'property_hs_timezone',
        'property_hs_latest_source_timestamp',
    },
    'contact_lists': {  # BUG https://jira.talendforge.org/browse/TDL-14996
        'authorId',
        'teamIds',
        'internal',
        'ilsFilterBranch',
        'limitExempt',
    },
    'email_events': {  # BUG https://jira.talendforge.org/browse/TDL-14997
        'portalSubscriptionStatus',
        'attempt',
        'source',
        'subscriptions',
        'sourceId',
        'replyTo',
        'suppressedMessage',
        'bcc',
        'suppressedReason',
        'cc',
     },
    'workflows': {  # BUG https://jira.talendforge.org/browse/TDL-14998
        'migrationStatus',
        'updateSource',
        'description',
        'originalAuthorUserId',
        'lastUpdatedByUserId',
        'creationSource',
        'portalId',
        'contactCounts',
    },
    'owners': {  # BUG https://jira.talendforge.org/browse/TDL-15000
        'activeSalesforceId'
    },
    'forms': {  # BUG https://jira.talendforge.org/browse/TDL-15001
        'alwaysCreateNewCompany',
        'themeColor',
        'publishAt',
        'editVersion',
        'themeName',
        'style',
        'thankYouMessageJson',
        'createMarketableContact',
        'kickbackEmailWorkflowId',
        'businessUnitId',
        'portableKey',
        'parentId',
        'kickbackEmailsJson',
        'unpublishAt',
        'internalUpdatedAt',
        'multivariateTest',
        'publishedAt',
        'customUid',
        'isPublished',
        'paymentSessionTemplateIds',
        'selectedExternalOptions',
    },
    'companies': {  # BUG https://jira.talendforge.org/browse/TDL-15003
        'mergeAudits',
        'stateChanges',
        'isDeleted',
        'additionalDomains',
        'property_hs_analytics_latest_source',
        'property_hs_analytics_latest_source_data_2',
        'property_hs_analytics_latest_source_data_1',
        'property_hs_analytics_latest_source_timestamp',
    },
    'campaigns': {  # BUG https://jira.talendforge.org/browse/TDL-15003
        'lastProcessingStateChangeAt',
        'lastProcessingFinishedAt',
        'processingState',
        'lastProcessingStartedAt',
    },
    'deals': {  # BUG https://jira.talendforge.org/browse/TDL-14999
        'imports',
        'property_hs_num_associated_deal_splits',
        'property_hs_is_deal_split',
        'stateChanges',
        'property_hs_num_associated_active_deal_registrations',
        'property_hs_num_associated_deal_registrations',
        'property_hs_analytics_latest_source',
        'property_hs_analytics_latest_source_timestamp_contact',
        'property_hs_analytics_latest_source_data_1_contact',
        'property_hs_analytics_latest_source_timestamp',
        'property_hs_analytics_latest_source_data_1',
        'property_hs_analytics_latest_source_contact',
        'property_hs_analytics_latest_source_company',
        'property_hs_analytics_latest_source_data_1_company',
        'property_hs_analytics_latest_source_data_2_company',
        'property_hs_analytics_latest_source_data_2',
        'property_hs_analytics_latest_source_data_2_contact',
    },
    'subscription_changes':{
        'normalizedEmailId'
    }
}


class TestHubspotAllFields(HubspotBaseTest):
    """Test that with all fields selected for a stream we replicate data as expected"""
    @staticmethod
    def name():
        return "tt_hubspot_all_fields_dynamic"

    def streams_under_test(self):
        """expected streams minus the streams not under test"""
        return self.expected_streams().difference({
            'owners',
            'subscription_changes', # BUG_TDL-14938 https://jira.talendforge.org/browse/TDL-14938
        })

    def setUp(self):
        self.maxDiff = None  # see all output in failure

        test_client = TestClient(start_date=self.get_properties()['start_date'])
        self.expected_records = dict()
        streams = self.streams_under_test()
        stream_to_run_last = 'contacts_by_company'
        if stream_to_run_last in streams:
            streams.remove(stream_to_run_last)
            streams = list(streams)
            streams.append(stream_to_run_last)

        for stream in streams:
            # Get all records
            if stream == 'contacts_by_company':
                company_ids = [company['companyId'] for company in self.expected_records['companies']]
                self.expected_records[stream] = test_client.read(stream, parent_ids=company_ids)
            else:
                self.expected_records[stream] = test_client.read(stream)

        for stream, records in self.expected_records.items():
            LOGGER.info("The test client found %s %s records.", len(records), stream)


        self.convert_datatype(self.expected_records)

    def convert_datatype(self, expected_records):
        for stream, records in expected_records.items():
            for record in records:

                # convert timestamps to string formatted datetime
                timestamp_keys = {'timestamp'}
                for key in timestamp_keys:
                    timestamp = record.get(key)
                    if timestamp:
                        unformatted = datetime.datetime.fromtimestamp(timestamp/1000)
                        formatted = datetime.datetime.strftime(unformatted, self.BASIC_DATE_FORMAT)
                        record[key] = formatted

        return expected_records

    def test_run(self):
        conn_id = connections.ensure_connection(self)

        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Select only the expected streams tables
        expected_streams = self.streams_under_test()
        catalog_entries = [ce for ce in found_catalogs if ce['tap_stream_id'] in expected_streams]
        for catalog_entry in catalog_entries:
            stream_schema = menagerie.get_annotated_schema(conn_id, catalog_entry['stream_id'])
            connections.select_catalog_and_fields_via_metadata(
                conn_id,
                catalog_entry,
                stream_schema
            )

        # Run sync
        first_record_count_by_stream = self.run_and_verify_sync(conn_id)
        synced_records = runner.get_records_from_target_output()

        # Test by Stream
        for stream in expected_streams:
            with self.subTest(stream=stream):

                # gather expected values
                replication_method = self.expected_replication_method()[stream]
                primary_keys = sorted(self.expected_primary_keys()[stream])

                # gather replicated records
                actual_records = [message['data']
                                  for message in synced_records[stream]['messages']
                                  if message['action'] == 'upsert']

                for expected_record in self.expected_records[stream]:

                    primary_key_dict = {primary_key: expected_record[primary_key] for primary_key in primary_keys}
                    primary_key_values = list(primary_key_dict.values())

                    with self.subTest(expected_record=primary_key_dict):
                        # grab the replicated record that corresponds to expected_record by checking primary keys
                        matching_actual_records_by_pk = get_matching_actual_record_by_pk(primary_key_dict, actual_records)
                        if not matching_actual_records_by_pk:
                            LOGGER.warn("Expected %s record was not replicated: %s",
                                        stream, primary_key_dict)
                            continue # skip this expected record if it isn't replicated
                        actual_record = matching_actual_records_by_pk[0]

                        expected_keys = set(expected_record.keys()).union(FIELDS_ADDED_BY_TAP.get(stream, {}))
                        actual_keys = set(actual_record.keys())

                        # NB: KNOWN_MISSING_FIELDS is a dictionary of streams to aggregated missing fields.
                        #     We will check each expected_record to see which of the known keys is present in expectations
                        #     and then will add them to the known_missing_keys set.
                        known_missing_keys = set()
                        for missing_key in KNOWN_MISSING_FIELDS.get(stream, set()):
                            if missing_key in expected_record.keys():
                                known_missing_keys.add(missing_key)
                                del expected_record[missing_key]

                        # NB : KNOWN_EXTRA_FIELDS is a dictionary of streams to fields that should not
                        #      be replicated but are. See the variable declaration at top of file for linked BUGs.
                        known_extra_keys = set()
                        for extra_key in KNOWN_EXTRA_FIELDS.get(stream, set()):
                            known_extra_keys.add(extra_key)

                        # Verify the fields in our expected record match the fields in the corresponding replicated record
                        expected_keys_adjusted = expected_keys.union(known_extra_keys)
                        actual_keys_adjusted = actual_keys.union(known_missing_keys)

                        # NB: The following woraround is for dynamic fields on the `deals` stream that we just can't track.
                        #     At the time of implementation there is no customer feedback indicating that these dynamic fields
                        #     would prove useful to an end user. The ones that we replicated with the test client are specific
                        #     to our test data. We have determined that the filtering of these fields is an expected behavior.

                        # deals workaround for 'property_hs_date_entered_<property>' fields
                        bad_key_prefixes = {'property_hs_date_entered_', 'property_hs_date_exited_'}
                        bad_keys = set()
                        for key in expected_keys_adjusted:
                            for prefix in bad_key_prefixes:
                                if key.startswith(prefix) and key not in actual_keys_adjusted:
                                    bad_keys.add(key)
                        for key in actual_keys_adjusted:
                            for prefix in bad_key_prefixes:
                                if key.startswith(prefix) and key not in expected_keys_adjusted:
                                    bad_keys.add(key)
                        for key in bad_keys:
                            if key in expected_keys_adjusted:
                                expected_keys_adjusted.remove(key)
                            elif key in actual_keys_adjusted:
                                actual_keys_adjusted.remove(key)

                        self.assertSetEqual(expected_keys_adjusted, actual_keys_adjusted)

                        # Future Testing | TDL-16145
                        # self.assertDictEqual(expected_record, actual_record)

                # Toss out a warn if tap is replicating more than the expected records were replicated
                expected_primary_key_values = {tuple([record[primary_key]
                                                      for primary_key in primary_keys])
                                               for record in self.expected_records[stream]}
                actual_records_primary_key_values = {tuple([record[primary_key]
                                                            for primary_key in primary_keys])
                                                     for record in actual_records}
                if expected_primary_key_values.issubset(actual_records_primary_key_values):
                    LOGGER.warn("Unexpected %s records replicated: %s",
                                stream,
                                actual_records_primary_key_values - expected_primary_key_values)


class TestHubspotAllFieldsStatic(TestHubspotAllFields):
    @staticmethod
    def name():
        return "tt_hubspot_all_fields_static"

    def streams_under_test(self):
        """expected streams minus the streams not under test"""
        return {
            'owners',
            # 'subscription_changes', # BUG_TDL-14938 https://jira.talendforge.org/browse/TDL-14938
        }

    def get_properties(self):
        return {'start_date' : '2021-05-02T00:00:00Z'}
