from enum import Enum

BLOCK_CATALOG_FILENAME = 'catalog.json'
REPLICATION_METHOD_INCREMENTAL = 'INCREMENTAL'
STATE_FILENAME = 'state.json'

# Copied from: mage-ai/mage_integrations/mage_integrations/sources/constants.py
COLUMN_FORMAT_DATETIME = 'date-time'
COLUMN_FORMAT_UUID = 'uuid'

COLUMN_TYPE_ARRAY = 'array'
COLUMN_TYPE_BINARY = 'binary'
COLUMN_TYPE_BOOLEAN = 'boolean'
COLUMN_TYPE_INTEGER = 'integer'
COLUMN_TYPE_NULL = 'null'
COLUMN_TYPE_NUMBER = 'number'
COLUMN_TYPE_OBJECT = 'object'
COLUMN_TYPE_STRING = 'string'

COLUMN_SCHEMA_DATETIME = dict(
    format=COLUMN_FORMAT_DATETIME,
    type=[
        COLUMN_TYPE_NULL,
        COLUMN_TYPE_STRING,
    ],
)

COLUMN_SCHEMA_UUID = dict(
    format=COLUMN_FORMAT_UUID,
    type=[
        COLUMN_TYPE_NULL,
        COLUMN_TYPE_STRING,
    ],
)

COLUMN_TYPES = [
  COLUMN_TYPE_ARRAY,
  COLUMN_TYPE_BINARY,
  COLUMN_TYPE_BOOLEAN,
  COLUMN_TYPE_INTEGER,
  COLUMN_TYPE_NULL,
  COLUMN_TYPE_NUMBER,
  COLUMN_TYPE_OBJECT,
  COLUMN_TYPE_STRING,
]

CONFIG_KEY_CLEAN_UP_INPUT_FILE = 'clean_up_input_file'

EXECUTION_PARTITION_FROM_NOTEBOOK = '_from_notebook'

OUTPUT_TYPE_RECORD = 'RECORD'
OUTPUT_TYPE_SCHEMA = 'SCHEMA'
TYPE_OBJECT = 'object'

KEY_BOOKMARK_PROPERTIES = 'bookmark_properties'
KEY_DESTINATION_TABLE = 'destination_table'
KEY_DISABLE_COLUMN_TYPE_CHECK = 'disable_column_type_check'
KEY_KEY_PROPERTIES = 'key_properties'
KEY_METADATA = 'metadata'
KEY_PARTITION_KEYS = 'partition_keys'
KEY_PROPERTIES = 'properties'
KEY_RECORD = 'record'
KEY_REPLICATION_METHOD = 'replication_method'
KEY_SCHEMA = 'schema'
KEY_STREAM = 'stream'
KEY_TABLE = 'table'
KEY_TYPE = 'type'
KEY_UNIQUE_CONFLICT_METHOD = 'unique_conflict_method'
KEY_UNIQUE_CONSTRAINTS = 'unique_constraints'
KEY_VALUE = 'value'
KEY_VERSION = 'version'

REPLICATION_METHOD_FULL_TABLE = 'FULL_TABLE'
REPLICATION_METHOD_INCREMENTAL = 'INCREMENTAL'
REPLICATION_METHOD_LOG_BASED = 'LOG_BASED'

MB_1 = 1024 * 1000
MAX_QUERY_STRING_SIZE = 10 * MB_1


class IngestMode(str, Enum):
    DISK = 'disk'
    MEMORY = 'memory'
