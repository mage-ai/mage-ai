from tap_pipedrive.stream import PipedriveStream


class NotesStream(PipedriveStream):
    endpoint = 'notes'
    schema = 'notes'
    key_properties = ['id', ]
    state_field = 'update_time'
