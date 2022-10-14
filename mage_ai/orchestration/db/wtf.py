import multiprocessing

def test(target, target_args):
    def test2(*args):
        from mage_ai.orchestration.db import db_connection
        db_connection.start_session()

        return target(*args)
    
    return multiprocessing.Process(target=test2, args=target_args)
