class Download():
    def __init__(self, token):
        self.token = token

    def to_dict(self, **kwargs):
        data = {}
        data['token'] = self.token
        return data
