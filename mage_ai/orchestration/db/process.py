import asyncio
import multiprocessing
import os
import sys


def reset_inherited_event_loop() -> None:
    """Give a forked child process its own asyncio event loop.

    A child created with the ``fork`` start method (the default on Linux) inherits
    the parent's current event loop: the loop object, its selector and every
    callback registered on it. The web server forks from inside its running loop
    when it restarts a dead scheduler (``scheduler_manager.check_scheduler_status``)
    and when it runs a pipeline from the notebook (``websocket_server``), and the
    scheduler forks its worker processes in turn. All of them inherit the server
    loop with the Jupyter kernel's ZMQ sockets registered on it.

    ``jupyter_client`` applies ``nest_asyncio`` in the server, which makes
    ``asyncio.run`` reuse ``asyncio.get_event_loop()`` instead of creating a loop.
    The first ``asyncio.run`` in such a child (``PipelineExecutor.execute`` for a
    pipeline with ``run_pipeline_in_one_process``, for example) therefore runs on
    the inherited loop, the inherited ZMQ handler spins forever (libzmq does not
    work across fork) and the pipeline never progresses.

    CPython 3.12+ resets the current loop after fork itself (python/cpython#66285);
    this does the same on 3.10 and 3.11. The inherited loop is left open on
    purpose: it belongs to the parent, and its default executor's threads do not
    exist in the child, so closing it here could block.
    """
    asyncio.set_event_loop(asyncio.new_event_loop())


if sys.version_info < (3, 12) and hasattr(os, 'register_at_fork'):
    # Runs in every process forked after this module is imported. The server
    # imports it at startup (through scheduler_manager), so this covers the
    # scheduler, its worker pool and workers, and the notebook pipeline run.
    os.register_at_fork(after_in_child=reset_inherited_event_loop)


def start_session_and_run(*target_args, **kwargs):
    from mage_ai.orchestration.db import db_connection

    if len(target_args) == 0:
        return None
    target = target_args[0]
    args = target_args[1:]

    db_connection.start_session(force=True)

    try:
        results = target(*args)
    finally:
        db_connection.close_session()
    return results


def create_process(target, args=()):
    from mage_ai.orchestration.db import engine

    new_args = [target, *args]
    engine.dispose()
    return multiprocessing.Process(target=start_session_and_run, args=new_args)
