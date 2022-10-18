import multiprocessing

def create_process(target, args=()):
    def start_session_and_run(*target_args):
        from mage_ai.orchestration.db import db_connection
        db_connection.start_session()

        results = target(*target_args)

        db_connection.close_session()
        return results
    
    return multiprocessing.Process(target=start_session_and_run, args=args)
