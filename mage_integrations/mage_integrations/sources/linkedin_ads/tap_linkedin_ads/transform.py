import re
from re import sub
from decimal import Decimal

from datetime import datetime, timedelta
import singer

LOGGER = singer.get_logger()


# Convert camelCase to snake_case
def convert(name):
    regsub = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', regsub).lower()

def snake_case_to_camel_case(text):
    if not text:
        return text

    words = text.split('_')
    first_word = words[0]
    remaining_words = words[1:]

    return first_word + ''.join(word.title() for word in remaining_words)

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
        try:
            new_key = convert(key)
        except TypeError as err:
            LOGGER.error('Error key = %s', key)
            raise err
        if isinstance(this_json[key], dict):
            out[new_key] = convert_json(this_json[key])
        elif isinstance(this_json[key], list):
            out[new_key] = convert_array(this_json[key])
        else:
            out[new_key] = this_json[key]
    return out


# convert string/currency number to decimal
def string_to_decimal(val):
    try:
        new_val = Decimal(sub(r'[^\d.]', '', val))
        return new_val
    except Exception:
        return None


def transform_accounts(data_dict):
    # convert string numbers to float/decimal numbers
    currency_fields = ['total_budget']
    for currency_field in currency_fields:
        if currency_field in data_dict:
            val = data_dict[currency_field]
            data_dict[currency_field] = string_to_decimal(val)
    return data_dict


def transform_analytics(data_dict):
    # convert string numbers to float/decimal numbers
    currency_fields = ['conversion_value_in_local_currency',
                       'cost_in_local_currency',
                       'cost_in_usd']
    for currency_field in currency_fields:
        if currency_field in data_dict:
            val = data_dict[currency_field]
            data_dict[currency_field] = string_to_decimal(val)
    # create pivot id and urn fields from pivot and pivot_value
    if 'pivot' in data_dict and 'pivot_value' in data_dict:
        key = data_dict['pivot'].lower()
        val = data_dict['pivot_value']
        search = re.search('^urn:li:(.*):(.*)$', val)
        if search:
            data_dict[key] = val
    # Create start_at and end_at fields from nested date_range
    if 'date_range' in data_dict:
        if 'start' in data_dict['date_range']:
            if 'day' in data_dict['date_range']['start'] \
            and 'month' in data_dict['date_range']['start'] \
            and 'year' in data_dict['date_range']['start']:
                year = data_dict['date_range']['start']['year']
                month = data_dict['date_range']['start']['month']
                day = data_dict['date_range']['start']['day']
                start_at = datetime(year=year, month=month, day=day)
                data_dict['start_at'] = start_at.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
        if 'end' in data_dict['date_range']:
            if 'day' in data_dict['date_range']['end'] \
            and 'month' in data_dict['date_range']['end'] \
            and 'year' in data_dict['date_range']['end']:
                year = data_dict['date_range']['end']['year']
                month = data_dict['date_range']['end']['month']
                day = data_dict['date_range']['end']['day']
                end_at = datetime(year=year, month=month, day=day) + timedelta(days=1)
                data_dict['end_at'] = end_at.strftime('%Y-%m-%dT%H:%M:%SZ')
    return data_dict


def transform_campaigns(data_dict): #pylint: disable=too-many-branches,too-many-statements
    # convert string numbers to float/decimal numbers
    currency_fields = ['daily_budget', 'unit_cost']
    for currency_field in currency_fields:
        val = data_dict.get(currency_field, {}).get('amount')
        if val:
            data_dict[currency_field]['amount'] = string_to_decimal(val)

    if 'targeting' not in data_dict or 'targeting_criteria' not in data_dict:
        return data_dict

    new_dict = data_dict
    # Abstract targeting excludes
    or_dict = data_dict.get('targeting', {}).get('excluded_targeting_facets', {})
    if 'excluded_targeting_facets' in new_dict['targeting']:
        del new_dict['targeting']['excluded_targeting_facets']
    new_dict['targeting']['excluded_targeting_facets'] = []
    ky_cnt = 0
    num = len(or_dict) - 1
    while ky_cnt <= num:
        key = list(or_dict)[ky_cnt]
        if isinstance(or_dict[key], list):
            if isinstance(or_dict[key][0], str):
                val = or_dict[key]
            elif isinstance(or_dict[key][0], dict):
                val = []
                for value in or_dict[key]:
                    val.append('{}'.format(value))
        elif isinstance(or_dict[key], dict):
            val = []
            val.append('{}'.format(or_dict[key]))
        append_dict = {'type': key,
                       'values': val}
        new_dict['targeting']['excluded_targeting_facets'].append(append_dict)
        ky_cnt = ky_cnt + 1

    # Abstract targeting includes
    or_dict = data_dict.get('targeting', {}).get('included_targeting_facets', {})
    if 'excluded_targeting_facets' in new_dict['targeting']:
        del new_dict['targeting']['included_targeting_facets']
    new_dict['targeting']['included_targeting_facets'] = []
    ky_cnt = 0
    num = len(or_dict) - 1
    while ky_cnt <= num:
        key = list(or_dict)[ky_cnt]
        if isinstance(or_dict[key], list):
            if isinstance(or_dict[key][0], str):
                val = or_dict[key]
            elif isinstance(or_dict[key][0], dict):
                val = []
                for value in or_dict[key]:
                    val.append('{}'.format(value))
        elif isinstance(or_dict[key], dict):
            val = []
            val.append('{}'.format(or_dict[key]))
        append_dict = {'type': key,
                       'values': val}
        new_dict['targeting']['included_targeting_facets'].append(append_dict)
        ky_cnt = ky_cnt + 1

    # Abstract targeting_criteria excludes
    or_dict = data_dict.get('targeting_criteria', {}).get('exclude', {}).get('or', {})
    if 'exclude' in new_dict['targeting_criteria']:
        del new_dict['targeting_criteria']['exclude']
    new_dict['targeting_criteria']['exclude'] = []
    ky_cnt = 0
    num = len(or_dict) - 1
    while ky_cnt <= num:
        key = list(or_dict)[ky_cnt]
        if isinstance(or_dict[key], list):
            if isinstance(or_dict[key][0], str):
                val = or_dict[key]
            elif isinstance(or_dict[key][0], dict):
                val = []
                for value in or_dict[key]:
                    val.append('{}'.format(value))
        elif isinstance(or_dict[key], dict):
            val = []
            val.append('{}'.format(or_dict[key]))
        append_dict = {'type': key,
                       'values': val}
        new_dict['targeting_criteria']['exclude'].append(append_dict)
        ky_cnt = ky_cnt + 1

    # Abstract targeting_criteria includes
    and_list = data_dict.get('targeting_criteria', {}).get('include', {}).get('and', {})
    for idx, and_criteria in enumerate(and_list):
        or_dict = and_criteria.get('or', {})
        if 'or' in new_dict['targeting_criteria']['include']['and'][idx]:
            del new_dict['targeting_criteria']['include']['and'][idx]['or']
        ky_cnt = 0
        num = len(or_dict) - 1
        while ky_cnt <= num:
            key = list(or_dict)[ky_cnt]
            if isinstance(or_dict[key], list):
                if isinstance(or_dict[key][0], str):
                    val = or_dict[key]
                elif isinstance(or_dict[key][0], dict):
                    val = []
                    for value in or_dict[key]:
                        val.append('{}'.format(value))
            elif isinstance(or_dict[key], dict):
                val = []
                val.append('{}'.format(or_dict[key]))
            new_dict['targeting_criteria']['include']['and'][idx]['type'] = key
            new_dict['targeting_criteria']['include']['and'][idx]['values'] = val
            ky_cnt = ky_cnt + 1

    return new_dict

# Abstract variables to type with key/value pairs
def transform_creatives(data_dict):
    if 'variables' not in data_dict:
        return data_dict

    new_dict = data_dict
    variables = new_dict.get('variables', {}).get('data', {})
    ky_cnt = 0
    num = len(variables) - 1
    while ky_cnt <= num:
        key = list(variables)[ky_cnt]
        params = new_dict.get('variables', {}).get('data', {}).get(key, {})
        new_dict['variables']['type'] = key
        new_dict['variables']['values'] = []

        pk_cnt = 0
        pnum = len(params) - 1
        while pk_cnt <= pnum:
            param_key = list(params)[pk_cnt]
            param_value = new_dict.get('variables', {}).get('data', {}).get(key, {})\
                .get(param_key, '')
            val = {'key': param_key,
                   'value': '{}'.format(param_value)}
            new_dict['variables']['values'].append(val)
            pk_cnt = pk_cnt + 1

        if 'data' in new_dict['variables']:
            del new_dict['variables']['data']
        ky_cnt = ky_cnt + 1

    return new_dict


# Copy audit fields to root level
def transform_audit_fields(data_dict):
    if 'change_audit_stamps' in data_dict:
        if 'last_modified' in data_dict['change_audit_stamps']:
            if 'time' in data_dict['change_audit_stamps']['last_modified']:
                data_dict['last_modified_time'] = data_dict['change_audit_stamps']\
                    ['last_modified']['time']
        if 'created' in data_dict['change_audit_stamps']:
            if 'time' in data_dict['change_audit_stamps']['created']:
                data_dict['created_time'] = data_dict['change_audit_stamps']['created']['time']
    return data_dict


# Create ID field for each URN
def transform_urn(data_dict):
    data_dict_copy = data_dict.copy()
    for key, val in data_dict_copy.items():
        # Create ID fields from URNs
        if isinstance(val, str):
            search = re.search('^urn:li:(.*):(.*)$', val)
            # Do not create keys for 'pivot_value' and 'value' URNs
            if search and not key in ('value', 'pivot_value', 'type'):
                id_type = convert(search.group(1).replace('sponsored', ''))
                if id_type == key:
                    new_key = '{}_id'.format(id_type)
                else:
                    new_key = '{}_{}_id'.format(key, id_type)
                if not id_type == 'unknown':
                    try:
                        # Set ID as integer
                        id_val = int(search.group(2))
                    except ValueError:
                        # Set ID as string
                        id_val = search.group(2)
                        pass #pylint: disable=unnecessary-pass
                    data_dict[new_key] = id_val
    return data_dict



def transform_data(data_dict, stream_name):
    new_dict = data_dict
    i = 0
    for record in data_dict['elements']:
        this_dict = record
        if stream_name.startswith('ad_analytics_by_'):
            this_dict = transform_analytics(this_dict)
        elif stream_name == 'accounts':
            this_dict = transform_accounts(this_dict)
        elif stream_name == 'campaigns':
            this_dict = transform_campaigns(this_dict)
        elif stream_name == 'creatives':
            this_dict = transform_creatives(this_dict)
        this_dict = transform_urn(this_dict)
        this_dict = transform_audit_fields(this_dict)

        new_dict['elements'][i] = this_dict
        i = i + 1
    return new_dict


def transform_json(this_json, stream_name):
    LOGGER.info('Transforming stream: %s', stream_name)
    converted_json = convert_json(this_json)
    transformed_json = transform_data(converted_json, stream_name)
    return transformed_json
