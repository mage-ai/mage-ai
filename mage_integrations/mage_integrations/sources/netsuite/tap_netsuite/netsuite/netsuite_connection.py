from netsuitesdk.api.accounts import Accounts
from netsuitesdk.api.classifications import Classifications
from netsuitesdk.api.departments import Departments
from netsuitesdk.api.currencies import Currencies
from netsuitesdk.api.locations import Locations
from netsuitesdk.api.vendors import Vendors
from netsuitesdk.api.subsidiaries import Subsidiaries
from netsuitesdk.api.employees import Employees
from netsuitesdk.api.expense_reports import ExpenseReports
from netsuitesdk.api.folders import Folders
from netsuitesdk.api.files import Files
from netsuitesdk.api.projects import Projects
from netsuitesdk.api.expense_categories import ExpenseCategory
from netsuitesdk.api.custom_lists import CustomLists
from netsuitesdk.api.custom_records import CustomRecords
from netsuitesdk.api.price_level import PriceLevel
from netsuitesdk.api.tax_items import TaxItems
from netsuitesdk.api.projects import Projects

import time
import json
import singer
from .transaction_entities import Customers, PurchaseOrder, Invoice, JournalEntries, InventoryTransfer, InventoryAdjustment, InventoryItem, VendorBills, VendorPayments, SalesOrders, CreditMemos, Items, InboundShipment, BankAccounts
from .netsuite_client import ExtendedNetSuiteClient

LOGGER = singer.get_logger()


class ExtendedNetSuiteConnection:
    def __init__(self, account, consumer_key, consumer_secret, token_key, token_secret, fetch_child=True, caching=True):
        # NetSuiteConnection.__init__(self, account, consumer_key, consumer_secret, token_key, token_secret)
        # ns_client: NetSuiteClient = self.client

        ns_client = ExtendedNetSuiteClient(account=account, fetch_child=fetch_child, caching=caching)
        ns_client.connect_tba(
            consumer_key=consumer_key,
            consumer_secret=consumer_secret,
            token_key=token_key,
            token_secret=token_secret
        )
        self.client = ns_client
        self.departments = Departments(ns_client)
        self.currencies = Currencies(ns_client)
        self.locations = Locations(ns_client)
        self.vendor_bills = VendorBills(ns_client)
        self.vendors = Vendors(ns_client)
        self.subsidiaries = Subsidiaries(ns_client)
        self.employees = Employees(ns_client)
        self.expense_reports = ExpenseReports(ns_client)
        self.folders = Folders(ns_client)
        self.files = Files(ns_client)
        self.expense_categories = ExpenseCategory(ns_client)
        self.custom_lists = CustomLists(ns_client)
        self.custom_records = CustomRecords(ns_client)
        self.projects = Projects(ns_client)
        self.vendor_payments = VendorPayments(ns_client)
        self.invoice = Invoice(ns_client)

        self.entities = {
            'Customer': Customers(ns_client),
            'Invoice': Invoice(ns_client),
            'Accounts': Accounts(ns_client),
            'JournalEntries': JournalEntries(ns_client),
            'Commission': JournalEntries(ns_client),
            'Classifications': Classifications(ns_client),
            'Vendors': self.vendors,
            'VendorBills': self.vendor_bills,
            'VendorPayment': self.vendor_payments,
            'InventoryAdjustment': InventoryAdjustment(ns_client),
            'InventoryTransfer': InventoryTransfer(ns_client),
            'PriceLevel': PriceLevel(ns_client),
            'InventoryItem': InventoryItem(ns_client),
            'SalesOrders': SalesOrders(ns_client),
            'CreditMemos': CreditMemos(ns_client),
            'Items': Items(ns_client),
            'PurchaseOrder': PurchaseOrder(ns_client),
            "Subsidiaries": self.subsidiaries,
            "TaxItems": TaxItems(ns_client),
            "InboundShipment": InboundShipment(ns_client),
            "Projects": Projects(ns_client),
            "BankAccounts": BankAccounts(ns_client),
        }

    def _query_entity(self, data, entity, stream):
        to_get_results_for = data.get(stream)
        for element in to_get_results_for:
            start_time = time.time()
            internal_id = element.get('internalId')
            LOGGER.info(f"fetching data for internalId {internal_id}")
            to_return = entity.get(internalId=internal_id)
            LOGGER.info(f"Successfully fetched data for internalId {internal_id} --- %s seconds ---" % (
                        time.time() - start_time))
            yield to_return

    def query_entity(self, stream=None, lastModifiedDate=None):
        start_time = time.time()
        LOGGER.info(f"Starting fetch data for stream {stream}")
        entity = self.entities[stream]

        if hasattr(entity, 'require_lastModified_date') and entity.require_lastModified_date is True:
            data = entity.get_all(lastModifiedDate)
        else:
            data = entity.get_all()

        # It is broken, maybe because of the change in the _paginated_search_to_generator in the API
        # if hasattr(entity, 'require_paging') and entity.require_paging is True:
        #     transformed_data = json.dumps({stream: data}, default=str, indent=2)
        #     data = json.loads(transformed_data)
        #     to_return = list(self._query_entity(data, entity, stream))
        # else:
        to_return = data

        LOGGER.info(f"Successfully fetched data for stream {stream}")
        LOGGER.info("--- %s seconds ---" % (time.time() - start_time))

        # with open('/tmp/salesorders.json', 'w') as oj:
        #     oj.write(json.dumps({stream: to_return}, default=str, indent=2))

        return to_return
