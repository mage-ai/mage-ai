import json
import time
from client import TestClient
from base import HubspotBaseTest

class TestHubspotTestClient(HubspotBaseTest):
    """
    Test the basic functionality of our Test Client. This is a tool for sanity checks, nothing more.

    To check an individual crud method, uncomment the corresponding test case below, and execute this file
    as if it is a normal tap-tester test via bin/run-test.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.test_client = TestClient(self.get_properties()['start_date'])

    ##########################################################################
    ### TESTING CREATES
    ##########################################################################

    # def test_contacts_create(self):
    #     # Testing contacts Post
    #     old_records = self.test_client.get_contacts()
    #     our_record = self.test_client.create_contacts()
    #     new_records = self.test_client.get_contacts()
    #     assert len(old_records) < len(new_records), \
    #         f"Before contacts post found {len(old_records)} records. After post found {len(new_records)} records"

    # def test_contacts_create_stability(self):
    #     old_records = self.test_client.get_contacts()
    #     our_record = self.test_client.create_contacts()
    #     responses = []
    #     for i in range(10):
    #         new_records = self.test_client.get_contacts()
    #         responses.append(new_records)
    #         time.sleep(1)
    #     all_versions = [record['versionTimestamp'] for response in responses
    #                     for record in response if record['vid'] == our_record[0]['vid']]
    #     from pprint import pprint as pp
    #     pp(all_versions)

    # def test_companies_create(self):
    #     # Testing companies Post

    #     old_records = self.test_client.get_companies('2021-08-25T00:00:00.000000Z')
    #     our_record = self.test_client.create_companies()
    #     now = time.time()
    #     time.sleep(6)

    #     new_records = self.test_client.get_companies('2021-08-25T00:00:00.000000Z')
    #     time_for_get = time.time()-now
    #     print(time_for_get)

    #     assert len(old_records) < len(new_records), \
    #         f"Before companies post found {len(old_records)} records. After post found {len(new_records)} records"

    # def test_contact_lists_create(self):
    #     # Testing contact_lists POST

    #     old_records = self.test_client.get_contact_lists()
    #     our_record = self.test_client.create_contact_lists()
    #     new_records = self.test_client.get_contact_lists()

    #     assert len(old_records) < len(new_records), \
    #         f"Before post found {len(old_records)} records. After post found {len(new_records)} records"


    # def test_contacts_by_company_create(self):
    #     # Testing contacts_by_company PUT


    #     old_contact_records = self.test_client.get_contacts()
    #     old_company_records = self.test_client.get_companies('2021-08-25T00:00:00.000000Z')
    #     old_records = self.test_client.get_contacts_by_company([old_company_records[0]["companyId"]])
    #     our_record = self.test_client.create_contacts_by_company()
    #     new_records = self.test_client.get_contacts_by_company([old_company_records[0]["companyId"]])
    #     assert len(old_records) < len(new_records), \
    #         f"Before post found {len(old_records)} records. After post found {len(new_records)} records"


    # def test_deal_pipelines_create(self):
    #     # Testing deal_pipelines POST

    #     old_records = self.test_client.get_deal_pipelines()
    #     our_record = self.test_client.create_deal_pipelines()
    #     new_records = self.test_client.get_deal_pipelines()
    #     assert len(old_records) < len(new_records), \
    #         f"Before post found {len(old_records)} records. After post found {len(new_records)} records"

    # def test_deal_pipelines_deletes(self):
    #     # Testing deal_pipelines DELETE
    #     import ipdb; ipdb.set_trace()
    #     1+1
    #     our_record = self.test_client.create_deal_pipelines()
    #     old_records = self.test_client.get_deal_pipelines()
    #     delete_records = self.test_client.delete_deal_pipelines(1)
    #     new_records = self.test_client.get_deal_pipelines()
    #     assert len(old_records) > len(new_records), \
    #         f"Before post found {len(old_records)} records. After post found {len(new_records)} records"

    # def test_deals_create(self):
    #     # Testing deals POST

    #     old_records = self.test_client.get_deals()
    #     our_record = self.test_client.create_deals()
    #     new_records = self.test_client.get_deals()
    #     assert len(old_records) < len(new_records), \
    #         f"Before post found {len(old_records)} records. After post found {len(new_records)} records"


    # def test_subscription_changes_and_email_events_create(self):
    #     # Testing subscription_changes  and email_events POST

    #     old_emails = self.test_client.get_email_events()
    #     old_subs = self.test_client.get_subscription_changes()
    #     our_record = self.test_client.create_subscription_changes()
    #     time.sleep(10)
    #     new_subs = self.test_client.get_subscription_changes()
    #     new_emails = self.test_client.get_email_events()

    #     assert len(old_subs) < len(new_subs), \
    #         f"Before post found {len(old_subs)} subs. After post found {len(new_subs)} subs"
    #     assert len(old_emails) < len(new_emails), \
    #         f"Before post found {len(old_emails)} emails. After post found {len(new_emails)} emails"
    #     print(f"Before {len(old_subs)} subs. After found {len(new_subs)} subs")
    #     print(f"Before {len(old_emails)} emails. After found {len(new_emails)} emails")

    # def test_engagements_create(self):
    #     # Testing create_engagements POST

    #     old_records = self.test_client.get_engagements()
    #     our_record = self.test_client.create_engagements()
    #     new_records = self.test_client.get_engagements()
    #     assert len(old_records) < len(new_records), \
    #         f"Before post found {len(old_records)} records. After post found {len(new_records)} records"


    # def test_forms_create(self):
    #     # Testing create_forms POST
    #     old_records = self.test_client.get_forms()
    #     our_record = self.test_client.create_forms()
    #     new_records = self.test_client.get_forms()
    #     assert len(old_records) < len(new_records), \
    #         f"Before post found {len(old_records)} records. After post found {len(new_records)} records"


    # def test_workflows_create(self):
    #     # Testing create_workflows POST

    #     old_records = self.test_client.get_workflows()
    #     our_record = self.test_client.create_workflows()
    #     new_records = self.test_client.get_workflows()
    #     assert len(old_records) < len(new_records), \
    #         f"Before post found {len(old_records)} records. After post found {len(new_records)} records"


    ##########################################################################
    ### TESTING UPDATES
    ##########################################################################


    # def test_workflows_update(self):    # TODO This failed to change the record
    #     # Testing update_workflows POST

    #     # grab a contact's email to use as the update
    #     contacts = self.test_client.get_contacts()
    #     for contact in contacts:
    #         if contact['properties'].get('email'):
    #             contact_email = contact['properties']['email']['value']
    #             break

    #     # old
    #     workflow = self.test_client.create('workflows')
    #     workflow_id = workflow[0]['id']
    #     old_record = self.test_client._get_workflows_by_pk(workflow_id=workflow_id)


    #     # do the update
    #     our_record = self.test_client.update_workflows(workflow_id=workflow_id, contact_email=contact_email)

    #     # new
    #     new_record = self.test_client._get_workflows_by_pk(workflow_id=workflow_id)

    #     self.assertNotEqual(old_record, new_record)

    # def test_contacts_update(self):
    #     new_record = self.test_client.create_contacts()
    #     record_vid = new_record[0]['vid']
    #     old_email = new_record[0]['properties']['email']['value']

    #     updated_record = self.test_client.update_contacts(record_vid)

    #     self.assertNotEqual(updated_record[0]['properties']['email']['value'], old_email)

    # def test_campaigns_update(self): TODO
    #     """No endpoint found."""
    #     self.fail("test_campaigns_update not implmented")

    # def test_companies_update(self):
    #     initial_record = self.test_client.create_companies()
    #     time.sleep(6)
    #     record_id = initial_record[0]['companyId']
    #     initial_value = initial_record[0]['properties']['description']['value']

    #     updated_record = self.test_client.update_companies(record_id)
    #     updated_value = updated_record['properties']['description']['value']

    #     self.assertNotEqual(initial_value, updated_value)

    # def test_contact_lists_update(self):
    #     initial_record = self.test_client.create_contact_lists()

    #     record_id = initial_record[0]['listId']
    #     initial_value = initial_record[0]['name']

    #     updated_record = self.test_client.update_contact_lists(record_id)
    #     updated_value = updated_record['name']

    #     self.assertNotEqual(initial_value, updated_value)

    # def test_deal_pipelines_update(self):
    #     initial_record = self.test_client.get_deal_pipelines()

    #     record_id = initial_record[0]['pipelineId']
    #     initial_value = initial_record[0]['label']

    #     updated_record = self.test_client.update_deal_pipelines(record_id)
    #     updated_value = updated_record['label']

    #     self.assertNotEqual(initial_value, updated_value)

    # def test_deals_update(self):
    #     initial_record = self.test_client.get_deals()

    #     record_id = initial_record[0]['dealId']
    #     initial_value = initial_record[0]['properties']['dealname']['value']

    #     updated_record = self.test_client.update_deals(record_id)
    #     updated_value = updated_record['properties']['dealname']['value']

    #     self.assertNotEqual(initial_value, updated_value)

    # def test_forms_update(self):
    #     initial_record = self.test_client.get_forms()

    #     record_id = initial_record[0]['guid']
    #     initial_value = initial_record[0]['name']

    #     updated_record = self.test_client.update_forms(record_id)
    #     updated_value = updated_record['name']

    #     self.assertNotEqual(initial_value, updated_value)

    # def test_owners_update(self): TODO
    #     """No endpoint found."""
    #     self.fail("test_owners_update not implmented")

    # def test_engagements_update(self):
    #     initial_record = self.test_client.get_engagements()

    #     record_id = initial_record[0]['engagement_id']
    #     initial_value = initial_record[0]['metadata']

    #     updated_record = self.test_client.update_engagements(record_id)
    #     updated_value = updated_record['metadata']

    #     self.assertNotEqual(initial_value, updated_value)

    ##########################################################################
    ### TODO updates
    ##########################################################################
    # def test_contacts_by_company_update(self):
    #     pass

    # def test_email_events_update(self):
    #     pass


    # def test_subscription_changes_update(self):
    #     pass
