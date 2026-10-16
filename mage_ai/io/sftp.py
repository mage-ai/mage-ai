from typing import Union

import paramiko
from pandas import DataFrame

from mage_ai.io.base import QUERY_ROW_LIMIT, BaseFile, FileFormat
from mage_ai.io.config import BaseConfigLoader, ConfigKey


class SFTP(BaseFile):
    """
    Handles data transfer between an SFTP server and the Mage app.
    Supports loading and exporting files in the following formats:
    - ".csv"
    - ".json"
    - ".parquet"
    - ".hdf5"

    Use the factory method ``with_config`` to construct the client from
    ``io_config.yaml``, or pass connection parameters directly.
    """

    def __init__(
        self,
        host: str,
        username: str,
        password: str = None,
        pkey: str = None,
        port: int = 22,
        verbose: bool = False,
        **kwargs,
    ) -> None:
        """
        Initializes SFTP client.

        Args:
            host: SFTP server hostname or IP address.
            username: Username for authentication.
            password: Password for authentication (optional if ``pkey`` given).
            pkey: Path to private key file (optional if ``password`` given).
            port: SFTP server port. Defaults to 22.
            verbose: Whether to print status messages.
        """
        super().__init__(verbose=verbose)
        self.host = host
        self.port = port

        self._transport = paramiko.Transport((host, port))

        private_key = None
        if pkey:
            import io
            is_string_key = '-----BEGIN' in pkey
            for pkey_class in (
                paramiko.RSAKey,
                paramiko.Ed25519Key,
                paramiko.ECDSAKey,
                paramiko.DSSKey,
            ):
                try:
                    if is_string_key:
                        private_key = pkey_class.from_private_key(io.StringIO(pkey))
                    else:
                        private_key = pkey_class.from_private_key_file(pkey)
                    break
                except paramiko.SSHException:
                    pass
            if not private_key:
                self._transport.close()
                raise ValueError("Invalid or unsupported private key format/path provided.")

        try:
            self._transport.connect(username=username, password=password, pkey=private_key)
            self._transport.set_keepalive(60)
            self.client = paramiko.SFTPClient.from_transport(self._transport)
        except Exception:
            self._transport.close()
            raise

    def load(
        self,
        remote_path: str,
        format: Union[FileFormat, str, None] = None,
        limit: int = QUERY_ROW_LIMIT,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from a remote SFTP path into a Pandas DataFrame.

        Args:
            remote_path: Absolute path on the SFTP server.
            format: File format. Inferred from extension when ``None``.
            limit: Maximum number of rows to load.

        Returns:
            DataFrame: Data loaded from the remote file.
        """
        if format is None:
            format = self._get_file_format(remote_path)

        with self.printer.print_msg(
            f'Loading data frame from SFTP at \'{remote_path}\''
        ):
            if format == FileFormat.HDF5:
                import os
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False) as tmp:
                    pass
                try:
                    self.client.get(remote_path, tmp.name)
                    return self._read(tmp.name, format, limit, **kwargs)
                finally:
                    os.remove(tmp.name)

            with self.client.open(remote_path, 'rb') as remote_file:
                return self._read(remote_file, format, limit, **kwargs)

    def export(
        self,
        data: Union[DataFrame, str],
        remote_path: str,
        format: Union[FileFormat, str, None] = None,
        **kwargs,
    ) -> None:
        """
        Exports a DataFrame (or local file) to a remote SFTP path.

        Args:
            data: DataFrame or local file path to upload.
            remote_path: Absolute destination path on the SFTP server.
            format: File format. Inferred from extension when ``None``.
        """
        if format is None:
            format = self._get_file_format(remote_path)

        with self.printer.print_msg(
            f'Exporting data to SFTP at \'{remote_path}\''
        ):
            if isinstance(data, DataFrame):
                with self.client.open(remote_path, 'wb') as remote_file:
                    self._write(data, format, remote_file, **kwargs)
            elif isinstance(data, str):
                self.client.put(data, remote_path)
            else:
                raise ValueError(
                    'Please provide a pandas DataFrame or a valid file path as the input.'
                )

    def exists(self, remote_path: str) -> bool:
        """
        Checks whether a file or directory exists at ``remote_path``.
        """
        try:
            self.client.stat(remote_path)
            return True
        except FileNotFoundError:
            return False
        except OSError as err:
            if err.errno == 2:
                return False
            raise

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        **kwargs,
    ) -> 'SFTP':
        """
        Initializes SFTP client from a configuration loader.

        Required config keys:
            - ``SFTP_HOST``
            - ``SFTP_USERNAME``

        Optional config keys:
            - ``SFTP_PASSWORD``
            - ``SFTP_PKEY``  (path to private key file)
            - ``SFTP_PORT``  (defaults to 22)

        Args:
            config: Configuration loader object.
        """
        host = config[ConfigKey.SFTP_HOST]
        username = config[ConfigKey.SFTP_USERNAME]
        if not host or not username:
            raise ValueError(
                'SFTP_HOST and SFTP_USERNAME must be provided in io_config.yaml.'
            )
        return cls(
            host=host,
            username=username,
            password=config[ConfigKey.SFTP_PASSWORD],
            pkey=config[ConfigKey.SFTP_PKEY],
            port=config[ConfigKey.SFTP_PORT] or 22,
            **kwargs,
        )

    def close(self) -> None:
        """Closes the SFTP client and underlying transport."""
        if self.client is not None:
            self.client.close()
        if self._transport is not None:
            self._transport.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def __del__(self):
        self.close()
        if self.verbose and self.printer.exists_previous_message:
            print('')
