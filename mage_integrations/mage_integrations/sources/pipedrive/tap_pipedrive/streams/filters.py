from tap_pipedrive.stream import PipedriveStream


class FiltersStream(PipedriveStream):
    endpoint = 'filters'
    schema = 'filters'
    key_properties = ['id', ]
    # Disabling this state_field as this stream is acting as FULL_TABLE now.
    # state_field = 'update_time'
