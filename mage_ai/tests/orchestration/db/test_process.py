import asyncio
import multiprocessing
import os
import unittest
from unittest.mock import MagicMock, patch

from mage_ai.orchestration.db.process import (
    create_process,
    reset_inherited_event_loop,
)
from mage_ai.tests.base_test import TestCase


def _nest_asyncio_style_run(coro):
    """What nest_asyncio turns asyncio.run into: run on the current loop."""
    return asyncio.get_event_loop().run_until_complete(coro)


async def _running_loop():
    return asyncio.get_running_loop()


def _report_child_loop(conn, parent_loop_id, parent_reader_fd):
    """Runs in the forked child: report which loop asyncio code would get there."""
    loop = asyncio.get_event_loop()
    conn.send(dict(
        same_loop=id(loop) == parent_loop_id,
        inherited_reader=parent_reader_fd in loop._selector.get_map(),
    ))
    conn.close()


class ResetInheritedEventLoopTests(TestCase):
    def setUp(self):
        super().setUp()
        self.inherited = asyncio.new_event_loop()
        asyncio.set_event_loop(self.inherited)

    def tearDown(self):
        current = asyncio.get_event_loop()
        if current is not self.inherited:
            current.close()
        self.inherited.close()
        asyncio.set_event_loop(None)
        super().tearDown()

    def test_replaces_the_current_loop_without_closing_it(self):
        reset_inherited_event_loop()

        current = asyncio.get_event_loop()
        self.assertIsNot(current, self.inherited)
        self.assertFalse(current.is_running())
        self.assertFalse(self.inherited.is_closed())

    def test_asyncio_run_no_longer_lands_on_the_inherited_loop(self):
        with patch('asyncio.run', _nest_asyncio_style_run):
            # Without the reset, a nest_asyncio-patched asyncio.run reuses the
            # inherited loop. This is what happens in a forked worker today.
            self.assertIs(asyncio.run(_running_loop()), self.inherited)

            reset_inherited_event_loop()

            self.assertIsNot(asyncio.run(_running_loop()), self.inherited)

    @unittest.skipUnless(hasattr(os, 'fork'), 'requires the fork start method')
    def test_forked_child_gets_its_own_loop(self):
        if multiprocessing.get_start_method(allow_none=True) not in (None, 'fork'):
            self.skipTest('requires the fork start method')

        # A callback registered on the parent's loop; the child must not see it.
        read_fd, write_fd = os.pipe()
        self.addCleanup(os.close, read_fd)
        self.addCleanup(os.close, write_fd)
        self.inherited.add_reader(read_fd, lambda: None)

        parent_conn, child_conn = multiprocessing.Pipe(duplex=False)
        with patch('mage_ai.orchestration.db.engine', MagicMock()), \
                patch('mage_ai.orchestration.db.db_connection', MagicMock()):
            process = create_process(
                _report_child_loop,
                args=(child_conn, id(self.inherited), read_fd),
            )
            process.start()
            report = parent_conn.recv() if parent_conn.poll(30) else None
            process.join(30)

        self.assertIsNotNone(report, 'the forked child did not report back')
        self.assertFalse(report['same_loop'], 'the child is using the parent\'s event loop')
        self.assertFalse(report['inherited_reader'], 'the child inherited a parent callback')
