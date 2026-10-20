from mage_integrations.sources.commercetools.streams.customers import CustomersStream
from mage_integrations.sources.commercetools.streams.discount_codes import DiscountCodesStream
from mage_integrations.sources.commercetools.streams.inventory import InventoryStream
from mage_integrations.sources.commercetools.streams.orders import OrdersStream
from mage_integrations.sources.commercetools.streams.payments import PaymentsStream
from mage_integrations.sources.commercetools.streams.products import ProductsStream


class IDS(object):
    CUSTOMERS = 'customers'
    DISCOUNT_CODES = 'discount_codes'
    INVENTORY = 'inventory'
    ORDERS = 'orders'
    PAYMENTS = 'payments'
    PRODUCTS = 'products'


STREAMS = {
    IDS.CUSTOMERS: CustomersStream,
    IDS.DISCOUNT_CODES: DiscountCodesStream,
    IDS.INVENTORY: InventoryStream,
    IDS.ORDERS: OrdersStream,
    IDS.PAYMENTS: PaymentsStream,
    IDS.PRODUCTS: ProductsStream,
}
