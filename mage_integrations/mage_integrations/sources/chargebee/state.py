import datetime
import singer

LOGGER = singer.get_logger()


def get_last_record_value_for_table(state, table, field):
    if state is None:
        return None

    last_value = state.get('bookmarks', {}) \
                      .get(table, {}) \
                      .get(field)

    if last_value is None:
        return None

    return last_value


def incorporate(state, table, key, value, force=False):
    if value is None:
        return state

    if isinstance(value, datetime.datetime):
        value = value.strftime('%Y-%m-%dT%H:%M:%SZ')

    if state is None:
        new_state = {}
    else:
        new_state = state.copy()

    if 'bookmarks' not in new_state:
        new_state['bookmarks'] = {}

    if table not in new_state['bookmarks']:
        new_state['bookmarks'][table] = {}

    if(new_state['bookmarks'].get(table, {}).get(key) is None or
       new_state['bookmarks'].get(table, {}).get(key) < value or
       force):
        new_state['bookmarks'][table][key] = value

    return new_state
