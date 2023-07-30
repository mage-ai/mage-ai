import boto3
import boto3.s3.transfer as s3transfer
import botocore

MAX_POOL_CONNECTIONS = 100
MAX_KEYS = 10000


class Client:
    def __init__(self, bucket, **kwargs):
        self.bucket = bucket
        self.client = kwargs.get(
            'client',
            boto3.client(
                's3',
                aws_access_key_id=kwargs.get('aws_access_key_id'),
                aws_secret_access_key=kwargs.get('aws_secret_access_key'),
                config=botocore.client.Config(max_pool_connections=MAX_POOL_CONNECTIONS),
                endpoint_url=kwargs.get('endpoint_url'),
            ),
        )
        self.transfer_config = s3transfer.TransferConfig(
            use_threads=True,
            max_concurrency=MAX_POOL_CONNECTIONS,
        )

    def download_file(self, object_key: str, filename_destination):
        return self.resource().Bucket(self.bucket).download_file(object_key, filename_destination)

    def resource(self):
        return boto3.resource('s3')

    def read(self, object_key: str):
        return self.get_object(object_key).read()

    def get_object(self, object_key: str):
        return self.client.get_object(Bucket=self.bucket, Key=object_key)['Body']

    def delete_objects(self, prefix: str):
        keys = self.list_objects(prefix)
        self.client.delete_objects(
            Bucket=self.bucket,
            Delete={
                'Objects': [{'Key': key} for key in keys],
            },
        )

    def listdir(self, prefix: str, delimiter: str = '/', suffix: str = None):
        keys = []
        response = self.client.list_objects_v2(
            Bucket=self.bucket,
            MaxKeys=MAX_KEYS,
            Prefix=prefix,
            Delimiter=delimiter,
        )
        if response.get('Contents'):
            for obj in response['Contents']:
                if suffix is None or obj['Key'].endswith(suffix):
                    keys.append(obj['Key'])
        if response.get('CommonPrefixes'):
            for obj in response['CommonPrefixes']:
                keys.append(obj['Prefix'])
        return keys

    def list_objects(self, prefix: str, max_keys: int = MAX_KEYS, suffix: str = None):
        keys = []
        response = self.client.list_objects_v2(Bucket=self.bucket, MaxKeys=max_keys, Prefix=prefix)
        if response.get('Contents'):
            for obj in response['Contents']:
                if suffix is None or obj['Key'].endswith(suffix):
                    keys.append(obj['Key'])
        return keys

    def upload(self, object_key: str, content):
        return self.client.put_object(
            Body=content,
            Bucket=self.bucket,
            Key=object_key,
        )

    def upload_object(self, object_key: str, file):
        return self.client.upload_fileobj(file, Bucket=self.bucket, Key=object_key)
