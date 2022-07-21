from enum import Enum


class DataType(str, Enum):
    DATA_FRAME = 'data_frame'
    IMAGE_PNG = 'image/png'
    TABLE = 'table'
    TEXT = 'text'
    TEXT_PLAIN = 'text/plain'


def parse_output_message(message: dict) -> dict:
    data_content = None
    data_type = None
    error = None

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
        data_type = DataType.TEXT_PLAIN
    elif image:
        data_content = image
        data_type = DataType.IMAGE_PNG
    elif traceback:
        data_content = [line for line in traceback]
        data_type = DataType.TEXT
        error = traceback
    elif text:
        data_content = text.split('\n')
        data_type = DataType.TEXT_PLAIN
    elif code:
        data_content = code
        data_type = DataType.TEXT

    return dict(
        data=data_content,
        error=error,
        execution_state=execution_state,
        metadata=metadata,
        msg_id=msg_id,
        msg_type=msg_type,
        type=data_type,
    )
