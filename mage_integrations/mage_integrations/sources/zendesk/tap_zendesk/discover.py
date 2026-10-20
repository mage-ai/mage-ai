import os
import json
import singer
import zenpy
from mage_integrations.sources.zendesk.tap_zendesk.streams import STREAMS
from mage_integrations.sources.zendesk.tap_zendesk.http import ZendeskForbiddenError

LOGGER = singer.get_logger()

def get_abs_path(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)

def load_shared_schema_refs():
    ref_sub_path = 'shared'
    shared_schemas_path = get_abs_path('schemas/' + ref_sub_path)

    shared_file_names = [f for f in os.listdir(shared_schemas_path)
                         if os.path.isfile(os.path.join(shared_schemas_path, f))]

    shared_schema_refs = {}
    for shared_file in shared_file_names:
        with open(os.path.join(shared_schemas_path, shared_file)) as data_file:
            shared_schema_refs[ref_sub_path + '/' + shared_file] = json.load(data_file)

    return shared_schema_refs

def discover_streams(client, config, selected_streams=None):
    streams = []
    error_list = []
    refs = load_shared_schema_refs()


    for stream_id, stream in STREAMS.items():
        if selected_streams and stream_id not in selected_streams:
            continue

        # for each stream in the `STREAMS` check if the user has the permission to access the data of that stream
        stream = stream(client, config)
        schema = singer.resolve_schema_references(stream.load_schema(), refs)
        try:
            # Here it call the check_access method to check whether stream have read permission or not.
            # If stream does not have read permission then append that stream name to list and at the end of all streams
            # raise forbidden error with proper message containing stream names.
            stream.check_access()
        except ZendeskForbiddenError as e:
            error_list.append(stream.name) # Append stream name to the error_list
        except zenpy.lib.exception.APIException as e:
            args0 = json.loads(e.args[0])
            err = args0.get('error')

            # check if the error is of type dictionary and the message retrieved from the dictionary
            # is the expected message. If so, only then print the logger message and return the schema
            if isinstance(err, dict):
                if err.get('message', None) == "You do not have access to this page. Please contact the account owner of this help desk for further help.":
                    error_list.append(stream.name)
            elif args0.get('description') == "You are missing the following required scopes: read":
                error_list.append(stream.name)
            else:
                raise e from None # raise error if it is other than 403 forbidden error

        streams.append({'stream': stream.name, 'tap_stream_id': stream.name, 'schema': schema, 'metadata': stream.load_metadata()})

    if error_list:

        total_stream = len(STREAMS.values()) # Total no of streams
        streams_name = ", ".join(error_list)
        if len(error_list) != total_stream:
            message = "The account credentials supplied do not have 'read' access to the following stream(s): {}. "\
                "The data for these streams would not be collected due to lack of required permission.".format(streams_name)
            # If atleast one stream have read permission then just print warning message for all streams
            # which does not have read permission
            LOGGER.warning(message)
        else:
            message ="HTTP-error-code: 403, Error: The account credentials supplied do not have 'read' access to any "\
            "of streams supported by the tap. Data collection cannot be initiated due to lack of permissions."
            # If none of the streams are having the 'read' access, then the code will raise an error
            raise ZendeskForbiddenError(message)


    return streams
