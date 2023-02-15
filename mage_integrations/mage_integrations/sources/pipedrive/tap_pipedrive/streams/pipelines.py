from tap_pipedrive.stream import PipedriveStream


class PipelinesStream(PipedriveStream):
    endpoint = 'pipelines'
    schema = 'pipelines'
    key_properties = ['id', ]
    replication_method = PipedriveStream.replication_method
    # Disabling this state_field as this stream is acting as FULL_TABLE now. 
    # state_field = 'update_time'
