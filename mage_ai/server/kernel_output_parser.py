def parse_output_message(message: dict) -> dict:
    data_content = None
    data_type = None

    header = message['header']
    msg_type = header['msg_type']

    parent_header = message['parent_header']
    msg_id = parent_header['msg_id']

    content = message['content']
    execution_state = content.get('execution_state')

    traceback = content.get('traceback')
    data = content.get('data', {})
    metadata = content.get('metadata')
    text = data.get('text/plain')
    code = data.get('code')
    image = data.get('image/png')

    if content.get('name') == 'stdout':
        text_stdout = content.get('text')
        data_content = text_stdout.split('\n')
        data_type = 'text/plain'
    elif image:
        data_content = image
        data_type = 'image/png'
    elif traceback:
        data_content = [line for line in traceback]
        data_type = 'text'
    elif text:
        data_content = text.split('\n')
        data_type = 'text/plain'
    elif code:
        data_content = code
        data_type = 'text'

    return dict(
        data=data_content,
        execution_state=execution_state,
        metadata=metadata,
        msg_id=msg_id,
        msg_type=msg_type,
        type=data_type,
    )
