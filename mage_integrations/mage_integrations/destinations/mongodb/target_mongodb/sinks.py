"""MongoDB target stream class, which handles writing streams."""

import urllib.parse

import pymongo
from bson.objectid import ObjectId

from mage_integrations.destinations.sink import BatchSink


class MongoDbSink(BatchSink):
    """MongoDB target sink class."""

    max_size = 100000

    def process_batch(self, context: dict) -> None:
        """Write out any prepped records and return once fully written."""
        # The SDK populates `context["records"]` automatically
        # since we do not override `process_record()`.

        # get connection configs
        connection_string = self.config.get("connection_string")
        db_name = self.config.get("db_name")
        # set the collection based on current stream
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
                        self.logger.warn(f"Malformed id: {find_id}.\
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
