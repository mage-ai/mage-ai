import time


def retry(
    retries: int = 3,
    delay: int = 5,
    max_delay: int = 60,
    exponential_backoff: bool = True,
):
    """
    Create the decorator to retry a method
    
    Args:
        retries (int, optional): Number of retry attempts.
        delay (int, optional): Delay between retries. If using exponential backoff retry,
            delay will be multiplied by 2 for each additional retry.
        max_delay (int, optional): Maximum delay time.
        exponential_backoff (bool, optional): Whether to use exponential backoff retry.
    """
    def retry_decorator(func):
        def retry_func(*args, **kwargs):
            attempt = 0
            total_delay = 0
            curr_delay = delay
            while attempt < retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    print(
                        'Exception thrown when attempting to run %s, attempt '
                        '%d of %d' % (func, attempt, retries)
                    )
                    attempt += 1
                    if attempt >= retries or total_delay + curr_delay >= max_delay:
                        raise e
                    time.sleep(curr_delay)
                    total_delay += curr_delay
                    if exponential_backoff:
                        curr_delay *= 2
            return func(*args, **kwargs)
        return retry_func
    return retry_decorator
