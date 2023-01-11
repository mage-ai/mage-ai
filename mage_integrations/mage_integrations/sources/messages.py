from mage_integrations.utils.parsers import encode_complex
from singer.messages import (
    RecordMessage,
    SchemaMessage as SchemaMessageOriginal,
    StateMessage,
)
from typing import List
import simplejson
import sys


class SchemaMessage(SchemaMessageOriginal):
    def __init__(
        self,
        disable_column_type_check: bool = None,
        partition_keys: List[str] = None,
        replication_method: str = None,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.disable_column_type_check = disable_column_type_check
        self.partition_keys = partition_keys
        self.replication_method = replication_method
        self.unique_conflict_method = unique_conflict_method
        self.unique_constraints = unique_constraints

    def asdict(self):
        result = super().asdict()

        if self.disable_column_type_check is not None:
            result['disable_column_type_check'] = self.disable_column_type_check
        if self.partition_keys:
            result['partition_keys'] = self.partition_keys
        if self.replication_method:
            result['replication_method'] = self.replication_method
        if self.unique_conflict_method:
            result['unique_conflict_method'] = self.unique_conflict_method
        if self.unique_constraints:
            result['unique_constraints'] = self.unique_constraints

        return result


def format_message(message):
    try:
        return simplejson.dumps(
            message.asdict(),
            default=encode_complex,
            ignore_nan=True,
            use_decimal=True,
        )
    except ValueError as err:
        raise Exception(f'Fail to serialize message {message}') from err


def write_message(message):
    sys.stdout.write(format_message(message) + '\n')
    sys.stdout.flush()


def write_schema(
    stream_name: str,
    schema,
    key_properties: List[str],
    bookmark_properties: List[str] = None,
    disable_column_type_check: bool = None,
    partition_keys: List[str] = None,
    replication_method: str = None,
    stream_alias: str = None,
    unique_conflict_method: str = None,
    unique_constraints: List[str] = None,
) -> None:
    """Write a schema message.

    stream = 'test'
    schema = {'properties': {'id': {'type': 'integer'}, 'email': {'type': 'string'}}}  # nopep8
    key_properties = ['id']
    write_schema(stream, schema, key_properties)
    """
    if isinstance(key_properties, (str, bytes)):
        key_properties = [key_properties]
    if not isinstance(key_properties, list):
        raise Exception("key_properties must be a string or list of strings")

    write_message(
        SchemaMessage(
            bookmark_properties=bookmark_properties,
            disable_column_type_check=disable_column_type_check,
            key_properties=key_properties,
            partition_keys=partition_keys,
            replication_method=replication_method,
            schema=schema,
            stream=(stream_alias or stream_name),
            unique_conflict_method=unique_conflict_method,
            unique_constraints=unique_constraints,
        ),
    )


def write_record(stream_name, record, stream_alias=None, time_extracted=None):
    """Write a single record for the given stream.

    write_record("users", {"id": 2, "email": "mike@stitchdata.com"})
    """
    write_message(RecordMessage(stream=(stream_alias or stream_name),
                                record=record,
                                time_extracted=time_extracted))


def write_records(stream_name, records):
    """Write a list of records for the given stream.

    chris = {"id": 1, "email": "chris@stitchdata.com"}
    mike = {"id": 2, "email": "mike@stitchdata.com"}
    write_records("users", [chris, mike])
    """
    for record in records:
        write_record(stream_name, record)


def write_state(value):
    """Write a state message.

    write_state({'last_updated_at': '2017-02-14T09:21:00'})
    """
    write_message(StateMessage(value=value))
