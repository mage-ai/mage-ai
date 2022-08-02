from datetime import datetime
from mage_ai.server.active_kernel import get_active_kernel_client


def get_messages(callback=None):
    now = datetime.utcnow()

    while True:
        try:
            client = get_active_kernel_client()
            message = client.get_iopub_msg(timeout=1)
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
