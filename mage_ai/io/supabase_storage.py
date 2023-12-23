import os
from contextlib import contextmanager
from io import BytesIO
from pathlib import Path
from typing import Dict, Union

import supabase
from pandas import DataFrame

from mage_ai.io.base import QUERY_ROW_LIMIT, BaseFile, FileFormat
from mage_ai.io.config import BaseConfigLoader, ConfigKey


class SupabaseStorage(BaseFile):
    def __init__(
            self,
            login_type: str = 'password',
            url: str = 'http://localhost:8000',
            api_key: str = None,
            email: str = None,
            password: str = None,
            auth_provider: str = None,
            phone: str = None,
            options: Dict = None,
            verbose: bool = None,
     ) -> None:
        super().__init__(verbose=verbose)
        self.client = supabase.Client(url, api_key)

        if login_type == 'password':
            if password and email:
                self.client.auth.sign_in_with_password({
                    'email': email,
                    'password': password
                })
            elif password and phone:
                # TODO
                # Password and Phone login type
                # Require a Token validation after the initial sign_in_with_password
                raise Exception('Phone and token login not supported')
            else:
                raise Exception('Missing Password OR email settings for password login type')
        elif login_type == 'otp':
            if phone or email:
                self.client.auth.sign_in_with_otp({
                    'phone': phone,
                    'email': email,
                    'options': options
                })
            else:
                raise Exception('You must provide either an email \
                                or phone number for otp login type')
        elif login_type == 'oauth':
            self.client.auth.sign_in_with_oauth({
                'provider': auth_provider,
                'options': options
            })
        else:
            raise Exception('invalid login_type. Valid types are: password, otp, oauth')

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'SupabaseStorage':
        return cls(
            email=config[ConfigKey.SUPABASE_EMAIL],
            password=config[ConfigKey.SUPABASE_PASSWORD],
            url=config[ConfigKey.SUPABASE_URL],
            api_key=config[ConfigKey.SUPABASE_API_KEY],
            login_type=config[ConfigKey.SUPABASE_LOGIN_TYPE],
            auth_provider=config[ConfigKey.SUPABASE_AUTH_PROVIDER],
            phone=config[ConfigKey.SUPABASE_PHONE],
            options=config[ConfigKey.SUPABASE_OPTIONS],
        )

    def load(
        self,
        bucket_name: str,
        object_key: str,
        format: Union[FileFormat, str, None] = None,
        limit: int = QUERY_ROW_LIMIT,
        **kwargs,
    ) -> DataFrame:
        """Loads a file from a Supabase Storage bucket to a DataFrame

        Args:
            bucket_name (str): Supabase Bucket name
            object_key (str): Supabase file path
            format (Union[FileFormat, str, None], optional): File format. Defaults to None.
            limit (int, optional): Rows limit. Defaults to QUERY_ROW_LIMIT (10_000_000).

        Returns:
            DataFrame: The data frame constructed from the file in the Supabase bucket
        """

        if format is None:
            format = self._get_file_format(object_key)
        with self.printer.print_msg(
            f'Loading data frame from bucket \'{bucket_name}\' at key \'{object_key}\''
        ):
            response = self.client.storage.from_(bucket_name).download(object_key)
        if format == FileFormat.HDF5:
            name = os.path.splitext(os.path.basename(object_key))[0]
            with self.open_temporary_directory() as temp_dir:
                obj_loc = temp_dir / f'{name}.hdf5'
                with obj_loc.open('wb') as fin:
                    fin.write(response)
                return self._read(obj_loc, format, limit, **kwargs)
        else:
            buffer = BytesIO(response)
            return self._read(buffer, format, limit, **kwargs)

    def export(
        self,
        df: DataFrame,
        bucket_name: str,
        object_key: str,
        format: Union[FileFormat, str, None] = None,
        file_options: Dict = None,
        **kwargs,
    ) -> None:
        """Exports DataFrame to a Supabase Storage bucket

        Args:
            df (DataFrame): Data frame to export
            bucket_name (str): Supabase Bucket name
            object_key (str): Supabase file path
            format (Union[FileFormat, str, None], optional): File format to be written.
                                                             Defaults to None.
            file_options (Dict, optional): Supabase file option (content-type).
                                                             Defaults to None ('text/plain').
        """
        if format is None:
            format = self._get_file_format(object_key)

        with self.printer.print_msg(
            f'Exporting data frame to bucket \'{bucket_name}\' at key \'{object_key}\''
        ):
            if format == FileFormat.HDF5:
                name = os.path.splitext(os.path.basename(object_key))[0]
                with self.open_temporary_directory() as temp_dir:
                    obj_loc = temp_dir / f'{name}.hdf5'
                    self._write(df, format, obj_loc, **kwargs)
                    with obj_loc.open('rb') as fin:
                        self.client.storage.from_(bucket_name).upload(file=fin,
                                                                      path=object_key,
                                                                      file_options=file_options)
            else:
                buffer = BytesIO()
                self._write(df, format, buffer, **kwargs)
                buffer.seek(0)
                self.client.storage.from_(bucket_name).upload(file=buffer.getvalue(),
                                                              path=object_key,
                                                              file_options=file_options)

    def exists(self, bucket_id: str) -> bool:
        response = self.client.storage.get_bucket(bucket_id)
        return bucket_id is response.id

    @contextmanager
    def open_temporary_directory(self):
        temp_dir = Path.cwd() / '.tmp'
        temp_dir.mkdir(parents=True, exist_ok=True)
        yield temp_dir
        for file in temp_dir.iterdir():
            file.unlink()
        temp_dir.rmdir()
