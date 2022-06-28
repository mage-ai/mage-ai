from datetime import datetime


def get_messages(client, callback=None):
    now = datetime.utcnow()

    while True:
        try:
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
