import multiprocessing
import queue

from mage_ai.settings.server import KERNEL_MAGIC

EmptyModule = None
QueueModule = None

try:
    if KERNEL_MAGIC:
        import faster_fifo

        EmptyModule = faster_fifo.Empty
        QueueModule = faster_fifo.Queue
except ImportError:
    EmptyModule = queue.Empty
    QueueModule = multiprocessing.Queue


Empty = EmptyModule
Queue = QueueModule
