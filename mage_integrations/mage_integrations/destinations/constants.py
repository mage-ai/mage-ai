COLUMN_FORMAT_DATETIME = 'date-time'

COLUMN_TYPE_ARRAY = 'array'
COLUMN_TYPE_BOOLEAN = 'boolean'
COLUMN_TYPE_INTEGER = 'integer'
COLUMN_TYPE_NULL = 'null'
COLUMN_TYPE_NUMBER = 'number'
COLUMN_TYPE_OBJECT = 'object'
COLUMN_TYPE_STRING = 'string'

INTERNAL_COLUMN_CREATED_AT = '_mage_created_at'
INTERNAL_COLUMN_UPDATED_AT = '_mage_updated_at'
INTERNAL_COLUMN_SCHEMA = {
    INTERNAL_COLUMN_CREATED_AT: {
        "format": "date-time",
        "type": ["null", "string"]
    },
    INTERNAL_COLUMN_UPDATED_AT: {
        "format": "date-time",
        "type": ["null", "string"]
    },
}

KEY_BOOKMARK_PROPERTIES = 'bookmark_properties'
KEY_DISABLE_COLUMN_TYPE_CHECK = 'disable_column_type_check'
KEY_KEY_PROPERTIES = 'key_properties'
KEY_PARTITION_KEYS = 'partition_keys'
KEY_RECORD = 'record'
KEY_REPLICATION_METHOD = 'replication_method'
KEY_SCHEMA = 'schema'
KEY_STREAM = 'stream'
KEY_TYPE = 'type'
KEY_UNIQUE_CONFLICT_METHOD = 'unique_conflict_method'
KEY_UNIQUE_CONSTRAINTS = 'unique_constraints'
KEY_VALUE = 'value'
KEY_VERSION = 'version'

MB_1 = 1024 * 1000
MAX_QUERY_STRING_SIZE = 10 * MB_1

REPLICATION_METHOD_FULL_TABLE = 'FULL_TABLE'
REPLICATION_METHOD_INCREMENTAL = 'INCREMENTAL'
REPLICATION_METHOD_LOG_BASED = 'LOG_BASED'

UNIQUE_CONFLICT_METHOD_IGNORE = 'IGNORE'
UNIQUE_CONFLICT_METHOD_UPDATE = 'UPDATE'
