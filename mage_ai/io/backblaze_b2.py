from functools import lru_cache
from importlib.metadata import PackageNotFoundError, version

from botocore.config import Config

from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.s3 import S3

DEFAULT_B2_ENDPOINT_URL = 'https://s3.us-west-004.backblazeb2.com'


@lru_cache(maxsize=1)
def _user_agent_extra() -> str:
    """`b2ai-mage-ai/<version>` user agent, resolved once on first use."""
    try:
        pkg_version = version('mage-ai')
    except PackageNotFoundError:  # source checkout without installed dist metadata
        pkg_version = 'dev'
    return f'b2ai-mage-ai/{pkg_version}'


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

        The `b2ai-mage-ai/<version>` user agent is always sent. Any caller-provided
        `user_agent_extra` (passed directly and/or via a botocore `Config`) is
        appended to it rather than replacing it, and other settings on a caller
        `Config` are preserved.
        """
        caller_config = kwargs.pop('config', None)

        # Base UA first, then any extras the caller supplied via either channel.
        user_agent_parts = [_user_agent_extra()]
        config_extra = (
            getattr(caller_config, 'user_agent_extra', None)
            if caller_config is not None
            else None
        )
        if config_extra:
            user_agent_parts.append(config_extra)
        kwarg_extra = kwargs.pop('user_agent_extra', None)
        if kwarg_extra:
            user_agent_parts.append(kwarg_extra)

        client_config = Config(user_agent_extra=' '.join(user_agent_parts))
        if caller_config is not None:
            # Keep the caller's other Config settings; our (appended) UA wins.
            client_config = caller_config.merge(client_config)

        super().__init__(
            verbose=verbose, endpoint_url=endpoint_url, config=client_config, **kwargs,
        )

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        **kwargs,
    ) -> 'BackblazeB2':
        """
        Initializes a Backblaze B2 client from a configuration loader. This client
        accepts the following B2 credentials and settings:
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
                kwargs.pop('aws_access_key_id', None)
                or config[ConfigKey.B2_APPLICATION_KEY_ID]
                or config[ConfigKey.AWS_ACCESS_KEY_ID]
            ),
            aws_secret_access_key=(
                kwargs.pop('aws_secret_access_key', None)
                or config[ConfigKey.B2_APPLICATION_KEY]
                or config[ConfigKey.AWS_SECRET_ACCESS_KEY]
            ),
            # B2 S3 auth is application key id + key only; it does not support
            # session tokens. Do not inherit AWS_SESSION_TOKEN from a shared
            # profile; honor a token only when the caller passes one explicitly.
            aws_session_token=kwargs.pop('aws_session_token', None),
            region_name=(
                kwargs.pop('region_name', None)
                or config[ConfigKey.AWS_REGION]
            ),
            endpoint_url=(
                kwargs.pop('endpoint_url', None)
                or config[ConfigKey.B2_ENDPOINT_URL]
                or config[ConfigKey.AWS_ENDPOINT]
                or DEFAULT_B2_ENDPOINT_URL
            ),
            **kwargs,
        )
