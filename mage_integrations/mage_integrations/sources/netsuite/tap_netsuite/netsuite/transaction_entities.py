from collections import OrderedDict
from netsuitesdk.internal.utils import PaginatedSearch

from netsuitesdk.api.base import ApiBase

import singer

logger = singer.get_logger()


def prepare_custom_fields(that, eod):
    if 'customFieldList' in eod and eod['customFieldList']:
        custom_fields = []
        for field in eod['customFieldList']:
            if field['type'] == 'String':
                custom_fields.append(
                    that.ns_client.StringCustomFieldRef(
                        scriptId=field['scriptId'] if 'scriptId' in field else None,
                        internalId=field['internalId'] if 'internalId' in field else None,
                        value=field['value']
                    )
                )
            elif field['type'] == 'Select':
                custom_fields.append(
                    that.ns_client.SelectCustomFieldRef(
                        scriptId=field['scriptId'] if 'scriptId' in field else None,
                        internalId=field['internalId'] if 'internalId' in field else None,
                        value=self.ns_client.ListOrRecordRef(
                            internalId=field['value']
                        )
                    )
                )
        return that.ns_client.CustomFieldList(custom_fields)

    return None


class Customers(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='customer')
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        search_record = self.ns_client.basic_search_factory(type_name="Customer",
                                                            lastModifiedDate=last_modified_date)
        ps = PaginatedSearch(client=self.ns_client, type_name='Customer', pageSize=page_size,
                             search_record=search_record)
        return self._paginated_search_to_generator(ps)

    def post(self, data) -> OrderedDict:
        return None


class InboundShipment(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='InboundShipment')
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        search_record = self.ns_client.basic_search_factory(type_name="InboundShipment",
                                                            lastModifiedDate=last_modified_date)
        ps = PaginatedSearch(client=self.ns_client, type_name='InboundShipment', pageSize=page_size,
                             search_record=search_record)
        return self._paginated_search_to_generator(ps)

    def post(self, data) -> OrderedDict:
        return None


class InventoryItem(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='InventoryItem')
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='InventoryItem', operator='contains')
        search_record = self.ns_client.basic_search_factory(type_name="Item",
                                                            recordType=record_type_search_field,
                                                            lastModifiedDate=last_modified_date)
        ps = PaginatedSearch(client=self.ns_client, type_name='InventoryItem', pageSize=page_size,
                             search_record=search_record)
        return self._paginated_search_to_generator(ps)

    def post(self, data) -> OrderedDict:
        return None


class Opportunity(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='opportunity')
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='Opportunity', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction', recordType=record_type_search_field,
                                                           lastModifiedDate=last_modified_date)
        paginated_search = PaginatedSearch(client=self.ns_client,
                                           basic_search=basic_search,
                                           type_name='Transaction',
                                           pageSize=page_size)
        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        return None


class BankAccounts(ApiBase):

    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='Account')
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        search_field = self.ns_client.SearchEnumMultiSelectField(searchValue='_bank', operator='anyOf')
        basic_search = self.ns_client.basic_search_factory('Account', type=search_field,
                                                           lastModifiedDate=last_modified_date)
        paginated_search = PaginatedSearch(client=self.ns_client,
                                           basic_search=basic_search,
                                           type_name='Account',
                                           pageSize=page_size)
        return self._paginated_search_to_generator(paginated_search=paginated_search)


class SalesOrders(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='salesOrder')
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='SalesOrder', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction',
                                                           lastModifiedDate=last_modified_date,
                                                           recordType=record_type_search_field)
        paginated_search = PaginatedSearch(client=self.ns_client,
                                           basic_search=basic_search,
                                           type_name='Transaction',
                                           pageSize=page_size)
        
        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        return None


class InventoryTransfer(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='InventoryTransfer')
    
    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='InventoryTransfer', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction',
                                                           recordType=record_type_search_field,
                                                           lastModifiedDate=last_modified_date)
        paginated_search = PaginatedSearch(client=self.ns_client,
                                           type_name='Transaction',
                                           basic_search=basic_search,
                                           pageSize=page_size)
        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        return None


class Items(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='Item')
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        search_record = self.ns_client.basic_search_factory(type_name="Item",
                                                            lastModifiedDate=last_modified_date)
        ps = PaginatedSearch(client=self.ns_client, type_name='Item', pageSize=page_size,
                             search_record=search_record)
        return self._paginated_search_to_generator(ps)

    def post(self, data) -> OrderedDict:
        return None


class InventoryAdjustment(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='InventoryAdjustment')
    
    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='InventoryAdjustment', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction',
                                                           recordType=record_type_search_field,
                                                           lastModifiedDate=last_modified_date)
        paginated_search = PaginatedSearch(client=self.ns_client,
                                           type_name='Transaction',
                                           basic_search=basic_search,
                                           pageSize=page_size)
        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        return None
    

class VendorBills(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='VendorBills')
    
    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='VendorBill', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction',
                                                           recordType=record_type_search_field,
                                                           lastModifiedDate=last_modified_date)
        paginated_search = PaginatedSearch(client=self.ns_client,
                                           type_name='Transaction',
                                           basic_search=basic_search,
                                           pageSize=page_size)
        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        return None
    
class VendorPayments(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='VendorPayment')
    
    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='VendorPayment', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction',
                                                           recordType=record_type_search_field,
                                                           lastModifiedDate=last_modified_date)
        paginated_search = PaginatedSearch(client=self.ns_client,
                                           type_name='Transaction',
                                           basic_search=basic_search,
                                           pageSize=page_size)
        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        return None


class JournalEntries(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='journalEntry')
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='JournalEntry', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction',
                                                           lastModifiedDate=last_modified_date,
                                                           recordType=record_type_search_field)

        paginated_search = PaginatedSearch(client=self.ns_client,
                                           basic_search=basic_search,
                                           type_name='Transaction',
                                           pageSize=page_size)

        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        assert data['externalId'], 'missing external id'
        je = self.ns_client.JournalEntry(externalId=data['externalId'])
        line_list = []
        for eod in data['lineList']:
            eod['customFieldList'] = prepare_custom_fields(self, eod)
            jee = self.ns_client.JournalEntryLine(**eod)
            line_list.append(jee)

        je['lineList'] = self.ns_client.JournalEntryLineList(line=line_list)
        je['currency'] = self.ns_client.RecordRef(**(data['currency']))

        if 'memo' in data:
            je['memo'] = data['memo']

        if 'tranDate' in data:
            je['tranDate'] = data['tranDate']

        if 'tranId' in data:
            je['tranId'] = data['tranId']

        if 'subsidiary' in data:
            je['subsidiary'] = data['subsidiary']

        if 'class' in data:
            je['class'] = data['class']

        if 'location' in data:
            je['location'] = data['location']

        if 'department' in data:
            je['department'] = data['department']

        logger.info(
            f"Posting JournalEntries now with {len(je['lineList']['line'])} entries. ExternalId {je['externalId']} tranDate {je['tranDate']}")
        res = self.ns_client.upsert(je)
        return self._serialize(res)


class Invoice(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='invoice')
        self.require_paging = True
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='Invoice', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction',
                                                           lastModifiedDate=last_modified_date,
                                                           recordType=record_type_search_field)

        paginated_search = PaginatedSearch(client=self.ns_client,
                                           basic_search=basic_search,
                                           type_name='Transaction',
                                           pageSize=page_size)

        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        return None


class CreditMemos(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='creditmemo')
        self.require_paging = True
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='CreditMemo', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction',
                                                           lastModifiedDate=last_modified_date,
                                                           recordType=record_type_search_field)

        paginated_search = PaginatedSearch(client=self.ns_client,
                                           basic_search=basic_search,
                                           type_name='Transaction',
                                           pageSize=page_size)

        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        return None

class PurchaseOrder(ApiBase):
    def __init__(self, ns_client):
        ApiBase.__init__(self, ns_client=ns_client, type_name='PurchaseOrder')
        self.require_paging = True
        self.require_lastModified_date = True

    def get_all(self, last_modified_date=None):
        return self.get_all_generator(last_modified_date=last_modified_date)

    def get_all_generator(self, page_size=200, last_modified_date=None):
        record_type_search_field = self.ns_client.SearchStringField(searchValue='PurchaseOrder', operator='contains')
        basic_search = self.ns_client.basic_search_factory('Transaction',
                                                           lastModifiedDate=last_modified_date,
                                                           recordType=record_type_search_field)

        paginated_search = PaginatedSearch(client=self.ns_client,
                                           basic_search=basic_search,
                                           type_name='Transaction',
                                           pageSize=page_size)

        return self._paginated_search_to_generator(paginated_search=paginated_search)

    def post(self, data) -> OrderedDict:
        return None