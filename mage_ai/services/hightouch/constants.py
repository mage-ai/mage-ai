SUCCESS = 'success'
WARNING = 'warning'
CANCELLED = 'cancelled'
FAILED = 'failed'
PENDING = 'pending'
WARNING = 'warning'
SUCCESS = 'success'
QUERYING = 'querying'
PROCESSING = 'processing'
ABORTED = 'aborted'
QUEUED = 'queued'
INTERRUPTED = 'interrupted'
REPORTING = 'reporting'

TERMINAL_STATUSES = [CANCELLED, FAILED, SUCCESS, WARNING, INTERRUPTED]
PENDING_STATUSES = [
    QUEUED,
    QUERYING,
    PROCESSING,
    REPORTING,
    PENDING,
]

DEFAULT_POLL_INTERVAL = 3

HIGHTOUCH_BASE_URL = 'https://api.hightouch.com/api/v1'
