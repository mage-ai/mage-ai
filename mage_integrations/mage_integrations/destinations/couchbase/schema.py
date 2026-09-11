import datetime
import re

import simplejson as json
import singer
from jsonschema import validate
from jsonschema.exceptions import ValidationError

# StitchData compatible timestamp meta data
#  https://www.stitchdata.com/docs/data-structure/system-tables-and-columns
BATCH_TIMESTAMP = "_sdc_batched_at"
MAX_WARNING = 20

logger = singer.get_logger()


def clean_and_validate(message, schemas, invalids, on_invalid_record,
                       json_dumps=False):
    batch_tstamp = datetime.datetime.utcnow()
    batch_tstamp = batch_tstamp.replace(
        tzinfo=datetime.timezone.utc)

    if message.stream not in schemas:
        raise Exception(("A record for stream {} was encountered" +
                         "before a corresponding schema").format(
                             message.stream))

    schema = schemas[message.stream]

    try:
        validate(message.record, schema)
    except ValidationError as e:
        cur_validation = False
        error_message = str(e)

        # It's a bit hacky and fragile here...
        instance = re.sub(r".*instance\[\'(.*)\'\].*", r"\1",
                          error_message.split("\n")[5])
        type_ = re.sub(r".*\{\'type\'\: \[\'.*\', \'(.*)\'\]\}.*",
                       r"\1", error_message.split("\n")[3])

        # Save number-convertible strings...
        if type_ in ["integer", "number"]:
            n = None
            try:
                n = float(message.record[instance])
            except Exception:
                # In case we want to persist the rows with partially
                # invalid value
                message.record[instance] = None
                pass
            if n is not None:
                cur_validation = True

        if cur_validation is False:
            invalids = invalids + 1
            if invalids < MAX_WARNING:
                logger.warn(("Validation error in record [%s]" +
                             " :: %s :: %s :: %s") %
                            (instance, type_, str(message.record),
                             str(e)))
            elif invalids == MAX_WARNING:
                logger.warn("Max validation warning reached.")

            if on_invalid_record == "abort":
                raise ValidationError("Validation required and failed.")

    if BATCH_TIMESTAMP in schema["properties"].keys():
        message.record[BATCH_TIMESTAMP] = batch_tstamp.isoformat()

    record = message.record
    if json_dumps:
        try:
            record = bytes(json.dumps(record) + "\n", "UTF-8")
        except TypeError as e:
            logger.warning(record)
            raise e

    return record, invalids
