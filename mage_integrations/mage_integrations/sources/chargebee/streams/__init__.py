from .addons import AddonsStream
from .comments import CommentsStream
from .coupons import CouponsStream
from .credit_notes import CreditNotesStream
from .customers import CustomersStream
from .events import EventsStream
from .gifts import GiftsStream
from .invoices import InvoicesStream
from .item_families import ItemFamiliesStream
from .item_prices import ItemPricesStream
from .items import ItemsStream
from .orders import OrdersStream
from .payment_sources import PaymentSourcesStream
from .plans import PlansStream
from .promotional_credits import PromotionalCreditsStream
from .quotes import QuotesStream
from .subscriptions import SubscriptionsStream
from .transactions import TransactionsStream
from .virtual_bank_accounts import VirtualBankAccountsStream

COMMON_AVAILABLE_STREAMS = [
    EventsStream,
    CommentsStream,
    CouponsStream,
    CreditNotesStream,
    CustomersStream,
    GiftsStream,
    InvoicesStream,
    OrdersStream,
    PaymentSourcesStream,
    QuotesStream,
    PromotionalCreditsStream,
    SubscriptionsStream,
    TransactionsStream,
    VirtualBankAccountsStream
]

PLAN_MODEL_AVAILABLE_STREAMS = COMMON_AVAILABLE_STREAMS + [
    AddonsStream,
    PlansStream
]

ITEM_MODEL_AVAILABLE_STREAMS = COMMON_AVAILABLE_STREAMS + [
    ItemsStream,
    ItemPricesStream,
    ItemFamiliesStream
]

STREAMS = {
    AddonsStream.TABLE: AddonsStream,
    EventsStream.TABLE: EventsStream,
    CommentsStream.TABLE: CommentsStream,
    CouponsStream.TABLE: CouponsStream,
    CreditNotesStream.TABLE: CreditNotesStream,
    CustomersStream.TABLE: CustomersStream,
    GiftsStream.TABLE: GiftsStream,
    InvoicesStream.TABLE: InvoicesStream,
    ItemsStream.TABLE: ItemsStream,
    ItemPricesStream.TABLE: ItemPricesStream,
    ItemFamiliesStream.TABLE: ItemFamiliesStream,
    OrdersStream.TABLE: OrdersStream,
    PaymentSourcesStream.TABLE: PaymentSourcesStream,
    QuotesStream.TABLE: QuotesStream,
    PlansStream.TABLE: PlansStream,
    PromotionalCreditsStream.TABLE: PromotionalCreditsStream,
    SubscriptionsStream.TABLE: SubscriptionsStream,
    TransactionsStream.TABLE: TransactionsStream,
    VirtualBankAccountsStream.TABLE: VirtualBankAccountsStream
}
