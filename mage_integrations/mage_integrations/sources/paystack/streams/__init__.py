from .customers import CustomersStream
from .transactions import TransactionsStream


STREAMS = {
    CustomersStream.TABLE: CustomersStream,
    TransactionsStream.TABLE: TransactionsStream,
}
