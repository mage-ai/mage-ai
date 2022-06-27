import json


def get_messages(client, callback=None):
    def print_callback(message):
        print(message, callback)

        if callback:
            callback(message)

    while True:
        try:
            message = client.get_iopub_msg(timeout=1)

            content = message.get('content', {})

            print('message', message)

            if content:
                traceback = content.get('traceback')
                data = content.get('data', {})
                metadata = content.get('metadata')
                text = data.get('text/plain')
                code = data.get('code')
                image = data.get('image/png')

                if content.get('name') == 'stdout':
                    text_stdout = content.get('text')
                    print_callback(json.dumps(dict(
                        data=text_stdout,
                        type='text/plain',
                    )))
                elif image:
                    print_callback(json.dumps(dict(
                      data=image,
                      type='image/png',
                    )))
                elif traceback:
                    for line in traceback:
                        print_callback(json.dumps(dict(
                          data=line,
                          type='text',
                        )))
                elif text:
                    print_callback(json.dumps(dict(
                      data=text,
                      type='text/plain',
                    )))
                elif code:
                    print_callback(json.dumps(dict(
                      data=code,
                      type='text',
                    )))
        except Exception as e:
            if str(e):
                print('ERROR', e)
            pass
