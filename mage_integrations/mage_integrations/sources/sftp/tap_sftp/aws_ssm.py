import boto3


class AWS_SSM:

    _client = None

    @classmethod
    def _get_client(cls):
        # returned the connection if it exists, else instantiate it
        if cls._client:
            return cls._client
        else:
            cls._client = boto3.client('ssm')
            return cls._client

    @classmethod
    def get_decryption_key(cls, key_name):
        client = cls._get_client()
        response = client.get_parameter(
            Name=key_name,
            WithDecryption=True
        )
        return response.get('Parameter').get('Value')
