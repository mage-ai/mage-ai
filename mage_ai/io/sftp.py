import os
import posixpath
from contextlib import contextmanager
from io import BytesIO, StringIO
from pathlib import Path
from typing import Union

import paramiko
import polars as pl
from pandas import DataFrame

from mage_ai.io.base import QUERY_ROW_LIMIT, BaseFile, FileFormat
from mage_ai.io.config import BaseConfigLoader, ConfigKey


class Sftp(BaseFile):
    """
    Handles data transfer between an SFTP server and the Mage app. Supports loading files
    of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    - ".hdf5"

    Authenticates either with a username/password pair or with a private key (passed in as a
    file path or as the key contents). Use the factory method `with_config` to construct
    the data loader from `io_config.yaml`.
    """

    def __init__(
        self,
        host: str,
        port: int = 22,
        username: Union[str, None] = None,
        password: Union[str, None] = None,
        private_key: Union[str, os.PathLike, None] = None,
        private_key_passphrase: Union[str, None] = None,
        verbose: bool = False,
        **kwargs,
    ) -> None:
        """
        Initializes data loader for an SFTP server.

        Args:
            host (str): Hostname or IP address of the SFTP server.
            port (int, optional): Port number of the SFTP server. Defaults to 22.
            username (str, optional): Username for password or key authentication.
            password (str, optional): Password for password authentication. Used as the
                private key passphrase if `private_key` is supplied without
                `private_key_passphrase`.
            private_key (str or os.PathLike, optional): Path to a private key file or the
                private key contents (PEM string) for key-based authentication.
            private_key_passphrase (str, optional): Passphrase for the private key, if any.
        """
        super().__init__(verbose=verbose)
        self.host = host
        self.port = int(port) if port is not None else 22
        self.username = username
        self.password = password
        self.private_key = private_key
        self.private_key_passphrase = private_key_passphrase
        self.connect_kwargs = kwargs

        self._transport: Union[paramiko.Transport, None] = None
        self._sftp: Union[paramiko.SFTPClient, None] = None

    def _load_pkey(self) -> Union[paramiko.PKey, None]:
        if not self.private_key:
            return None

        passphrase = self.private_key_passphrase or self.password

        candidate = self.private_key
        # If the value looks like a filesystem path that exists, load from file.
        if isinstance(candidate, (str, os.PathLike)) and os.path.isfile(str(candidate)):
            for key_cls in (
                paramiko.RSAKey,
                paramiko.Ed25519Key,
                paramiko.ECDSAKey,
                paramiko.DSSKey,
            ):
                try:
                    return key_cls.from_private_key_file(
                        str(candidate), password=passphrase
                    )
                except paramiko.SSHException:
                    continue
            raise paramiko.SSHException(
                f'Could not parse private key at {candidate}.'
            )

        key_buffer = StringIO(str(candidate))
        for key_cls in (
            paramiko.RSAKey,
            paramiko.Ed25519Key,
            paramiko.ECDSAKey,
            paramiko.DSSKey,
        ):
            key_buffer.seek(0)
            try:
                return key_cls.from_private_key(key_buffer, password=passphrase)
            except paramiko.SSHException:
                continue
        raise paramiko.SSHException('Could not parse private key contents.')

    def open(self) -> paramiko.SFTPClient:
        """
        Opens (or returns) the underlying SFTP client. Reuses the connection if already open.
        """
        if self._sftp is not None:
            return self._sftp

        pkey = self._load_pkey()
        transport = paramiko.Transport((self.host, self.port))
        try:
            transport.connect(
                username=self.username,
                password=self.password if pkey is None else None,
                pkey=pkey,
            )
        except Exception:
            transport.close()
            raise

        self._transport = transport
        self._sftp = paramiko.SFTPClient.from_transport(transport)
        return self._sftp

    def close(self) -> None:
        """
        Closes the underlying SFTP client and transport, if open.
        """
        if self._sftp is not None:
            try:
                self._sftp.close()
            finally:
                self._sftp = None
        if self._transport is not None:
            try:
                self._transport.close()
            finally:
                self._transport = None

    def __enter__(self) -> 'Sftp':
        self.open()
        return self

    def __exit__(self, *args) -> None:
        self.close()

    def __del__(self) -> None:
        try:
            self.close()
        except Exception:
            pass
        super().__del__()

    def load(
        self,
        remote_path: str,
        format: Union[FileFormat, str, None] = None,
        limit: int = QUERY_ROW_LIMIT,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from a file on the SFTP server into a pandas DataFrame.

        Args:
            remote_path (str): Path to the file on the SFTP server.
            format (FileFormat, optional): Format of the file. Inferred from the
                file extension when omitted.
            limit (int, optional): Row limit forwarded to the underlying reader.

        Returns:
            DataFrame: Data frame loaded from the remote file.
        """
        if format is None:
            format = self._get_file_format(remote_path)

        with self.printer.print_msg(
            f'Loading data frame from SFTP path \'{remote_path}\''
        ):
            client = self.open()
            if format == FileFormat.HDF5:
                name = os.path.splitext(os.path.basename(remote_path))[0]
                with self.open_temporary_directory() as temp_dir:
                    obj_loc = temp_dir / f'{name}.hdf5'
                    client.get(remote_path, str(obj_loc))
                    return self._read(obj_loc, format, limit, **kwargs)
            with client.open(remote_path, 'rb') as fin:
                buffer = BytesIO(fin.read())
            return self._read(buffer, format, limit, **kwargs)

    def export(
        self,
        data: Union[DataFrame, pl.DataFrame, str],
        remote_path: str,
        format: Union[FileFormat, str, None] = None,
        **kwargs,
    ) -> None:
        """
        Exports a data frame (or local file) to a path on the SFTP server. Parent
        directories on the server are created automatically when missing.

        Args:
            data (DataFrame or str): Data frame to export, or path to a local file
                to upload as-is.
            remote_path (str): Destination path on the SFTP server.
            format (FileFormat, optional): Output format. Inferred from the file
                extension when omitted.
        """
        if format is None:
            format = self._get_file_format(remote_path)

        with self.printer.print_msg(
            f'Exporting data to SFTP path \'{remote_path}\''
        ):
            client = self.open()
            self._ensure_remote_dir(client, posixpath.dirname(remote_path))

            if isinstance(data, (DataFrame, pl.DataFrame)):
                if format == FileFormat.HDF5:
                    name = os.path.splitext(os.path.basename(remote_path))[0]
                    with self.open_temporary_directory() as temp_dir:
                        obj_loc = temp_dir / f'{name}.hdf5'
                        self._write(data, format, obj_loc, **kwargs)
                        client.put(str(obj_loc), remote_path)
                else:
                    buffer = BytesIO()
                    self._write(data, format, buffer, **kwargs)
                    buffer.seek(0)
                    with client.open(remote_path, 'wb') as fout:
                        fout.write(buffer.read())
            elif isinstance(data, str) and os.path.exists(data):
                client.put(data, remote_path)
            else:
                raise Exception(
                    'Please provide a pandas DataFrame or a valid file path as the input.'
                )

    def exists(self, remote_path: str) -> bool:
        """
        Checks whether a file or directory exists on the SFTP server.
        """
        client = self.open()
        try:
            client.stat(remote_path)
            return True
        except IOError:
            return False

    @staticmethod
    def _ensure_remote_dir(client: paramiko.SFTPClient, remote_dir: str) -> None:
        if not remote_dir or remote_dir in ('.', '/'):
            return
        # Build directories from the top down.
        parts = []
        head = remote_dir
        while head and head not in ('.', '/'):
            parts.append(head)
            new_head = posixpath.dirname(head)
            if new_head == head:
                break
            head = new_head
        for path_part in reversed(parts):
            try:
                client.stat(path_part)
            except IOError:
                client.mkdir(path_part)

    @contextmanager
    def open_temporary_directory(self):
        temp_dir = Path.cwd() / '.tmp'
        temp_dir.mkdir(parents=True, exist_ok=True)
        yield temp_dir
        for file in temp_dir.iterdir():
            file.unlink()
        temp_dir.rmdir()

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        **kwargs,
    ) -> 'Sftp':
        """
        Initializes an SFTP client from a configuration loader.
        """
        host = config[ConfigKey.SFTP_HOST]
        if not host:
            raise ValueError(
                'No valid configuration settings found for SFTP. '
                'You must specify SFTP_HOST.'
            )
        port = config[ConfigKey.SFTP_PORT] or 22
        return cls(
            host=host,
            port=port,
            username=config[ConfigKey.SFTP_USERNAME],
            password=config[ConfigKey.SFTP_PASSWORD],
            private_key=config[ConfigKey.SFTP_PRIVATE_KEY],
            private_key_passphrase=config[ConfigKey.SFTP_PRIVATE_KEY_PASSPHRASE],
            **kwargs,
        )
