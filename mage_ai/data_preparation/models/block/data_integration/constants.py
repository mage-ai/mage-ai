from mage_ai.shared.enum import StrEnum

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
OUTPUT_TYPE_STATE = 'STATE'
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
KEY_VALIDATION_RULES = 'validation_rules'
KEY_VALUE = 'value'
KEY_VERSION = 'version'

REPLICATION_METHOD_FULL_TABLE = 'FULL_TABLE'
REPLICATION_METHOD_INCREMENTAL = 'INCREMENTAL'
REPLICATION_METHOD_LOG_BASED = 'LOG_BASED'

MB_1 = 1024 * 1000
MAX_QUERY_STRING_SIZE = 10 * MB_1

VARIABLE_BOOKMARK_VALUES_KEY = '__bookmark_values__'


class IngestMode(StrEnum):
    DISK = 'disk'
    MEMORY = 'memory'

# Validation rule type constants - used by both frontend and backend
# These constants ensure consistency between UI and data persistence layers

# General validation types (apply to all column types)
VALIDATION_TYPE_NOTNULL = 'not null'
VALIDATION_TYPE_UNIQUE = 'unique'

# Integer/numeric validation types
VALIDATION_TYPE_INT_GT = '>'         # Greater than
VALIDATION_TYPE_INT_LT = '<'         # Less than  
VALIDATION_TYPE_INT_E = '='          # Equal to
VALIDATION_TYPE_INT_GTE = '>='       # Greater than or equal
VALIDATION_TYPE_INT_LTE = '<='       # Less than or equal
VALIDATION_TYPE_INT_NE = '!='        # Not equal

# String validation types
VALIDATION_TYPE_STR_IN = 'in'        # Value must be in specified list
VALIDATION_TYPE_STR_NOTIN = 'not in' # Value must not be in specified list
VALIDATION_TYPE_STR_NEQ = 'not equal'        # String must not equal value
VALIDATION_TYPE_STR_NEMS = 'not empty string' # String must have content
VALIDATION_TYPE_STR_MINL = 'minimum length'   # String minimum length check
VALIDATION_TYPE_STR_MAXL = 'maximum length'   # String maximum length check


