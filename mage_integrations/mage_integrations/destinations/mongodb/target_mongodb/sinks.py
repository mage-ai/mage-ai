"""MongoDB target stream class, which handles writing streams."""

import ast
import distutils
import json
import urllib.parse

import pymongo
from bson.objectid import ObjectId

from mage_integrations.destinations.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
)
from mage_integrations.destinations.sink import BatchSink


class MongoDbSink(BatchSink):
    """MongoDB target sink class."""

    max_size = 100000

    def preprocess_record(self, record: dict, context: dict) -> dict:
        for key, value in record.items():
            list_of_types = self.schema['properties'][key]['type']
            # Since we are trying to transform data types
            # Data can't contain more than 1 type besides null
            if len(list_of_types) == 2 and COLUMN_TYPE_NULL not in list_of_types:
                raise Exception(f"{self.schema['properties'][key]['type']} can't contain \
                                 more than 1 Not null type")

            elif len(list_of_types) > 2:
                raise Exception(f"{self.schema['properties'][key]['type']} can't contain \
                                 more than 1 Not null type")

            if COLUMN_TYPE_NULL in list_of_types and value is None:
                continue

            type_name = [type for type in list_of_types if type != 'null'][0]
            type_value = type(value)

            try:
                if type_name == COLUMN_TYPE_ARRAY and type_value is not list:
                    record[key] = ast.literal_eval(value)
                elif type_name == COLUMN_TYPE_BOOLEAN and type_value is not bool:
                    # distutils is depreciated at 3.12+
                    record[key] = bool(distutils.util.strtobool(value))
                elif type_name == COLUMN_TYPE_INTEGER and type_value is not int:
                    record[key] = int(value)
                elif type_name == COLUMN_TYPE_NUMBER and type_value is not float:
                    record[key] = float(value)
                elif type_name == COLUMN_TYPE_OBJECT and type_value is not dict:
                    record[key] = json.loads(value)
                elif type_name == COLUMN_TYPE_STRING and type_value is not str:
                    record[key] = str(value)
            except Exception:
                raise Exception(f"Error transforming {value} in {type_name}")

        return record

    def process_batch(self, context: dict) -> None:
        """Write out any prepped records and return once fully written."""
        # The SDK populates `context["records"]` automatically
        # since we do not override `process_record()`.

        # get connection configs
        connection_string = self.config.get("connection_string")
        db_name = self.config.get("db_name")
        collection = self.config.get("table_name")
        if collection is None:
            collection = urllib.parse.quote(self.stream_name)

        client = pymongo.MongoClient(connection_string,
                                     connectTimeoutMS=2000,
                                     retryWrites=True)
        db = client[db_name]

        records = context["records"]

        if len(self.key_properties) > 0:
            primary_id = self.key_properties[0]

            for record in records:
                find_id = record[primary_id]

                # pop the key from update if primary key is _id
                if primary_id == '_id':
                    try:
                        find_id = ObjectId(find_id)
                    except Exception:
                        self.logger.info(f"Malformed id: {find_id}.\
                                         Skipping this record.")
                        continue

                    record.pop("_id")

                # Last parameter True is upsert which inserts a new record if
                # it doesnt exists or replaces current if found
                db[collection].update_one({primary_id: find_id},
                                          {"$set": record}, True)
        else:
            db[collection].insert_many(records)

        self.logger.info(f"Uploaded {len(records)} records into {collection}")

        # Clean up records
        context["records"] = []
