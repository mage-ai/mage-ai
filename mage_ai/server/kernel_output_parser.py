def parse_output_message(message: dict) -> dict:
    data_content = None
    data_type = None

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
        data_content = text_stdout
        data_type = 'text/plain'
    elif image:
        data_content = image
        data_type = 'image/png'
    elif traceback:
        data_content = [line for line in traceback]
        data_type = 'text'
    elif text:
        data_content = text
        data_type = 'text/plain'
    elif code:
        data_content = code
        data_type = 'text'

    return dict(
        data=data_content,
        execution_state=execution_state,
        metadata=metadata,
        type=data_type,
    )
