from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.s3 import S3

DEFAULT_B2_ENDPOINT_URL = 'https://s3.us-west-004.backblazeb2.com'


class BackblazeB2(S3):
    """
    Handles data transfer between a Backblaze B2 bucket and the Mage app. Supports
    loading files of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    - ".hdf5"

    Backblaze B2 exposes an S3-compatible API, so this class is a thin subclass of
    `S3` that defaults the endpoint URL to a Backblaze B2 region endpoint. Use the
    factory method `with_config` to construct the data loader using a B2
    application key.
    """

    def __init__(
        self,
        verbose: bool = False,
        endpoint_url: str = DEFAULT_B2_ENDPOINT_URL,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from a Backblaze B2 bucket. By default the loader
        targets the `us-west-004` region; specify:
        - `endpoint_url` - B2 S3-compatible endpoint URL for your bucket's region
        - `aws_access_key_id` - your B2 Application Key ID
        - `aws_secret_access_key` - your B2 Application Key
        """
        super().__init__(verbose=verbose, endpoint_url=endpoint_url, **kwargs)

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        **kwargs,
    ) -> 'BackblazeB2':
        """
        Initializes a Backblaze B2 client from a configuration loader. This client
        accepts the following B2 credential secrets:
        - Application Key ID
        - Application Key
        - Endpoint URL

        Falls back to the equivalent AWS keys (`AWS_ACCESS_KEY_ID`,
        `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT`) when a B2 key is not present.

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        return cls(
            aws_access_key_id=(
                config[ConfigKey.B2_APPLICATION_KEY_ID]
                or config[ConfigKey.AWS_ACCESS_KEY_ID]
            ),
            aws_secret_access_key=(
                config[ConfigKey.B2_APPLICATION_KEY]
                or config[ConfigKey.AWS_SECRET_ACCESS_KEY]
            ),
            aws_session_token=config[ConfigKey.AWS_SESSION_TOKEN],
            region_name=config[ConfigKey.AWS_REGION],
            endpoint_url=(
                config[ConfigKey.B2_ENDPOINT_URL]
                or config[ConfigKey.AWS_ENDPOINT]
                or DEFAULT_B2_ENDPOINT_URL
            ),
            **kwargs,
        )
