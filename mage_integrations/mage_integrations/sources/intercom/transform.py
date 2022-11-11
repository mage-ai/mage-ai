import math as m

from singer.utils import strptime_to_utc


# De-nest each list node up to record level
def denest_list_nodes(this_json, data_key, list_nodes):
    new_json = this_json
    i = 0
    for record in list(this_json.get(data_key, [])):
        for list_node in list_nodes:
            this_node = record.get(list_node, {}).get(list_node, [])
            if not this_node == []:
                new_json[data_key][i][list_node] = this_node
            else:
                new_json[data_key][i].pop(list_node, None)
        i = i + 1
    return new_json

# De-nest conversation_parts from conversations w/ key conversation fields
def transform_conversation_parts(this_json, data_key):
    new_json = []
    for record in list(this_json.get(data_key, [])):
        conv_id = record.get('id')
        conv_created = record.get('created_at')
        conv_updated = record.get('updated_at')
        conv_total_parts = record.get('conversation_parts', {}).get('total_parts')
        conv_parts = record.get('conversation_parts', {}).get('conversation_parts', [])
        for conv_part in conv_parts:
            part = conv_part
            part['conversation_id'] = conv_id
            part['conversation_total_parts'] = conv_total_parts
            part['conversation_created_at'] = conv_created
            part['conversation_updated_at'] = conv_updated
            new_json.append(part)
    return new_json


# Run other transforms, as needed: denest_list_nodes, transform_conversation_parts
def transform_json(this_json, stream_name, data_key):
    new_json = this_json
    if stream_name == 'users':
        list_nodes = ['companies', 'segments', 'social_profiles', 'tags']
        denested_json = denest_list_nodes(new_json, data_key, list_nodes)
        new_json = denested_json
    elif stream_name == 'companies':
        list_nodes = ['segments', 'tags']
        denested_json = denest_list_nodes(new_json, data_key, list_nodes)
        new_json = denested_json
    elif stream_name == 'conversations':
        list_nodes = ['tags', 'contacts']
        denested_json = denest_list_nodes(new_json, data_key, list_nodes)
        new_json = denested_json
    elif stream_name == 'conversation_parts':
        denested_json = transform_conversation_parts(new_json, data_key)
        new_json = denested_json
    if data_key in new_json:
        return new_json[data_key]
    return new_json


# Traverse schema and find all date-times where
# a path is the array of keys needed to descend
# the schema(tree) to locate the desired value.
# Returns an array of path arrays.
def find_datetimes_in_schema(schema):
    paths = []
    if 'properties' in schema and isinstance(schema, dict):
        for k, v in schema['properties'].items(): #pylint: disable=invalid-name
            if 'format' in v and v['format'] == 'date-time':
                paths.append([k])
            else:
                paths += [
                    [k] + x for x in find_datetimes_in_schema(v)
                ]
    if 'items' in schema and isinstance(schema, dict):
        for k, v in schema.get('items').get('properties', {}).items(): #pylint: disable=invalid-name
            if 'format' in v and v['format'] == 'date-time':
                paths.append([[k]])
            else:
                paths += [
                    [k] + x for x in find_datetimes_in_schema(v)
                ]
    return paths


def get_integer_places(value):
    if 0 <= value <= 999999999999997:
        return int(m.log10(value)) + 1
    elif value < 0:
        return 10
    else:
        counter = 15
        while value >= 10**counter:
            counter += 1
        return counter

# Traverse dict by array of keys and return path's value
def nested_get(dic, keys):
    for key in keys:
        if isinstance(key, list):
            dic = [elem[key[0]] for elem in dic]
        elif dic and key in dic:
            dic = dic[key]
        else:
            return None
    return dic

# Set nested value by arrray of keys as path
def nested_set(dic, keys, value):
    for key in keys[:-1]:
        if not isinstance(dic[key], list):
            dic = dic.setdefault(key, {})

    if not isinstance(dic.get(keys[0], {}), list):
        dic[keys[-1]] = value
    else:
        for index, _ in enumerate(dic.get(keys[0])):
            dic[keys[0]][index][keys[-1][0]] = value[index]

# API returns date times, epoch seconds and epoch millis
# Transform datetimes to epoch millis
# Transform epoch seconds to millis
def transform_times(record, schema_datetimes):
    for datetime_path in schema_datetimes:
        datetime = nested_get(record, datetime_path)

        if isinstance(datetime, list):
            nested_set(record, datetime_path, [dt * 1000 for dt in datetime])
        elif datetime and isinstance(datetime, str):
            converted_ts = strptime_to_utc(datetime).timestamp() * 1000
            nested_set(record, datetime_path, converted_ts)
        elif datetime and get_integer_places(datetime) == 10:
            nested_set(record, datetime_path, datetime * 1000)
