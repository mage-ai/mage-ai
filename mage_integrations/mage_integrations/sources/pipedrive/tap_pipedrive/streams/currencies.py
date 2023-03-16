from tap_pipedrive.stream import PipedriveStream


class CurrenciesStream(PipedriveStream):
    endpoint = 'currencies'
    schema = 'currency'
    key_properties = ['id', ]
