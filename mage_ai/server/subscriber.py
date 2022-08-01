from datetime import datetime
from mage_ai.server.kernels import test_kernel


def get_messages(callback=None):
    now = datetime.utcnow()

    while True:
        try:
            test = test_kernel.active_kernel.client()
            message = test.get_iopub_msg(timeout=1)
            print(f'[{now}] Message:', message)

            if message.get('content'):
                if callback:
                    callback(message)
                else:
                    print(f'[{now}] No callback for message: {message}')
        except Exception as e:
            if str(e):
                print(f'[{now}] Error: {e}', )
            pass
