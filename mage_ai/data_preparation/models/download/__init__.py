class Download():
    def __init__(self, token, host):
        self.uri = f'http://{host}/api/downloads/{token}'

    def to_dict(self, **kwargs):
        data = {}
        data['uri'] = self.uri
        return data
