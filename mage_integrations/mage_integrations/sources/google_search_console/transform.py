import hashlib
import json
import re
import singer

LOGGER = singer.get_logger()


# Convert camelCase to snake_case
def convert(name):
    regsub = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', regsub).lower()


# Convert keys in json array
def convert_array(arr):
    new_arr = []
    for i in arr:
        if isinstance(i, list):
            new_arr.append(convert_array(i))
        elif isinstance(i, dict):
            new_arr.append(convert_json(i))
        else:
            new_arr.append(i)
    return new_arr


# Convert keys in json
def convert_json(this_json):
    out = {}
    for key in this_json:
        new_key = convert(key)
        if isinstance(this_json[key], dict):
            out[new_key] = convert_json(this_json[key])
        elif isinstance(this_json[key], list):
            out[new_key] = convert_array(this_json[key])
        else:
            out[new_key] = this_json[key]
    return out


# Remove 'keys' node, if exists
def remove_keys_nodes(this_json, path):
    new_json = this_json
    i = 0
    for record in list(this_json[path]):
        if record.get('keys', None):
            new_json[path][i].pop('keys')
        i = i + 1
    return new_json


# Create MD5 hash key for data element
def hash_data(data):
    # Prepare the project id hash
    hashId = hashlib.md5()
    hashId.update(repr(data).encode('utf-8'))
    return hashId.hexdigest()


# Denest keys values list to dimension_list keys
def denest_key_fields(this_json, stream_name, path, dimensions_list):
    new_json = this_json
    i = 0
    for record in list(this_json[path]):
        for key in list(record.keys()):
            if isinstance(record[key], list):
                if key == 'keys':
                    dim_num = 0
                    # Add dimensions_hash_key for performance_report_custom
                    if stream_name == 'performance_report_custom':
                        dims_md5 = str(hash_data(json.dumps(record[key], sort_keys=True)))
                        new_json[path][i]['dimensions_hash_key'] = dims_md5
                    for dimension in dimensions_list:
                        new_json[path][i][dimension] = record[key][dim_num]
                        dim_num = dim_num + 1
        i = i + 1
    return new_json


# Add site_url to results
def add_site_url(this_json, path, site):
    new_json = this_json
    i = 0
    for record in this_json[path]:
        new_json[path][i]['site_url'] = site
        i = i + 1
    return new_json


# Add search_type to results
def add_search_type(this_json, path, sub_type):
    new_json = this_json
    i = 0
    for record in this_json[path]:
        new_json[path][i]['search_type'] = sub_type
        i = i + 1
    return new_json


def transform_reports(this_json, stream_name, path, site, sub_type, dimensions_list):
    # de-nest keys array to dimension fields and add MD5 hash key for custom report
    denested_json = denest_key_fields(this_json, stream_name, path, dimensions_list)
    # remove keys array node
    keyless_json = remove_keys_nodes(denested_json, path)
    # add site_url and search_type to results
    new_json = add_search_type(add_site_url(keyless_json, path, site), path, sub_type)
    return new_json


# Run all transforms: convert camelCase to snake_case for fieldname keys,
#  and stream-specific transforms for sitemaps and performance_reports.
def transform_json(this_json, stream_name, path, site, sub_type, dimensions_list):
    converted_json = convert_json(this_json)
    if stream_name == 'sitemaps':
        new_json = add_site_url(converted_json, path, site)
    elif stream_name.startswith('performance_report'):
        new_json = transform_reports(converted_json, stream_name, path, site, sub_type, dimensions_list)
    else:
        new_json = converted_json
    return new_json
