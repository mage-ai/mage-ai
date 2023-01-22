import singer
import singer.bookmarks
import os
import tap_hubspot

LOGGER = singer.get_logger()

caught_records = {}
caught_bookmarks = []
caught_state = {}
caught_schema = {}
caught_pks = {}


def verify_environment_vars():
    missing_envs = [x for x in [os.getenv('TAP_HUBSPOT_REDIRECT_URI'),
                                os.getenv('TAP_HUBSPOT_CLIENT_ID'),
                                os.getenv('TAP_HUBSPOT_CLIENT_SECRET'),
                                os.getenv('TAP_HUBSPOT_REFRESH_TOKEN')] if x is None]
    if len(missing_envs) != 0:
        #pylint: disable=line-too-long
        raise Exception("set TAP_HUBSPOT_REDIRECT_URI, TAP_HUBSPOT_CLIENT_ID, TAP_HUBSPOT_CLIENT_SECRET, TAP_HUBSPOT_REFRESH_TOKEN")

def seed_tap_hubspot_config():
    tap_hubspot.CONFIG = {
        "access_token": None,
        "token_expires": None,

        "redirect_uri":   os.environ['TAP_HUBSPOT_REDIRECT_URI'],
        "client_id":      os.environ['TAP_HUBSPOT_CLIENT_ID'],
        "client_secret":  os.environ['TAP_HUBSPOT_CLIENT_SECRET'],
        "refresh_token":  os.environ['TAP_HUBSPOT_REFRESH_TOKEN'],
        "start_date": "2001-01-01T00:00:00Z"
    }

def get_clear_state():
    return {
        "bookmarks": {
            "contacts": {
                "offset": {},
                "lastmodifieddate": None
            },
            "companies": {
                "offset": {},
                "hs_lastmodifieddate": None
            }

        },
        "currently_syncing": None
    }


#pylint: disable=line-too-long
def our_write_bookmark(state, table_name, bookmark_key, bookmark_value):
    caught_bookmarks.append([bookmark_key, bookmark_value])
    state = singer.bookmarks.write_bookmark(state, table_name, bookmark_key, bookmark_value)
    return state

def our_write_schema(table_name, schema, pks):
    caught_pks[table_name] = pks
    caught_schema[table_name] = schema

def our_write_state(state):
    # pylint: disable=global-statement
    LOGGER.info("our_write_state: %s", state)
    global caught_state
    caught_state = state
    return state

def our_write_record(table_name, record):
    if caught_records.get(table_name) is None:
        caught_records[table_name] = []

    caught_records[table_name].append(record)

def write_to_singer():
    singer.write_bookmark = our_write_bookmark
    singer.write_state = our_write_state
    singer.write_record = our_write_record
    singer.write_schema = our_write_schema
