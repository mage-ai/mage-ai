import multiprocessing as mp



def start_session_and_run(*target_args):
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
    return mp.Process(target=start_session_and_run, args=new_args)


class Worker(mp.Process):
    def __init__(self, queue: mp.Queue):
        super().__init__()
        self.queue = queue

    def run(self):
        while True:
            args = self.queue.get()

            start_session_and_run(*args)


class WorkerManager:
    def __init__(self, max_processes=4):
        self.max_processes = max_processes
        self.queue = mp.Queue()
        self.workers = []


    def start_workers(self):
        for _ in range(self.max_processes):
            worker = Worker(self.queue)
            worker.start()
            self.workers.append(worker)


    def add_job(self, target, args=()):
        # from mage_ai.orchestration.db import engine

        self.queue.put([target, *args])

        # new_args = [target, *args]
        # engine.dispose()

        # return multiprocessing.Process(target=self.start_session_and_run, args=new_args)

worker_manager = WorkerManager()
