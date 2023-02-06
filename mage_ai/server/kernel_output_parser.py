from enum import Enum


class DataType(str, Enum):
    DATA_FRAME = 'data_frame'
    IMAGE_PNG = 'image/png'
    PROGRESS = 'progress'
    TABLE = 'table'
    TEXT = 'text'
    TEXT_HTML = 'text/html'
    TEXT_PLAIN = 'text/plain'


COMMS_MESSAGE_TYPES = [
    'comm_open',
    'comm_msg',
    'comm_close',
]


def parse_output_message(message: dict) -> dict:
    data_content = None
    data_type = None
    error = None

    header = message['header']
    msg_type = header['msg_type']

    parent_header = message['parent_header']
    msg_id = parent_header.get('msg_id')

    content = message['content']
    execution_state = content.get('execution_state')

    traceback = content.get('traceback')
    data = content.get('data', {})
    metadata = content.get('metadata')
    text = data.get('text/plain')
    text_html = data.get('text/html')
    code = data.get('code')
    image = data.get('image/png')

    if content.get('name') in ['stdout', 'stderr']:
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
    elif text_html:
        data_content = text_html
        data_type = DataType.TEXT_HTML
    elif text:
        data_content = text.split('\n')
        if len(data_content[-1]) != 0:
            data_content.append('')
        data_type = DataType.TEXT_PLAIN
    elif code:
        data_content = code
        data_type = DataType.TEXT
    elif msg_type in COMMS_MESSAGE_TYPES:
        if data.get('method') == 'update':
            progress_data = f"{data.get('state', dict()).get('value', 0) * 100}"
            data_content = progress_data
            data_type = DataType.PROGRESS

    return dict(
        data=data_content,
        error=error,
        execution_state=execution_state,
        metadata=metadata,
        msg_id=msg_id,
        msg_type=msg_type,
        type=data_type,
    )
