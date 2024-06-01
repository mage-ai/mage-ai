import io
import sys
import threading


class AsyncStdout(io.StringIO):
    def __init__(self):
        super().__init__()
        self._buffer = io.StringIO()
        self._old_stdout = sys.stdout
        self._lock = threading.Lock()

    def flush(self):
        with self._lock:
            self._old_stdout.flush()
            self._buffer.flush()

    def get_output(self):
        with self._lock:
            self._buffer.seek(0)
            output = self._buffer.read()
            self._buffer.seek(0)
            self._buffer.truncate(0)
            return output

    def write(self, s):
        with self._lock:
            self._buffer.write(s)
            self._buffer.flush()
            self._old_stdout.write(s)
            self._old_stdout.flush()

    def reset_buffer(self):
        with self._lock:
            self._buffer = io.StringIO()
