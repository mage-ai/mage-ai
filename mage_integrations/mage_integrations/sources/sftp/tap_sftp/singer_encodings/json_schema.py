
from mage_integrations.sources.sftp.tap_sftp.aws_ssm import AWS_SSM

from . import csv_handler

SDC_SOURCE_FILE_COLUMN = "_sdc_source_file"
SDC_SOURCE_LINENO_COLUMN = "_sdc_source_lineno"
SDC_SOURCE_LAST_MODIFIED = "_sdc_source_last_modified"


def get_schema_for_table(conn, table_spec, config):
    files = conn.get_files(table_spec['search_prefix'], table_spec['search_pattern'])

    if not files:
        return {}

    samples = sample_files(conn, table_spec, files, config)

    data_schema = {
        **generate_schema(samples, table_spec),
        SDC_SOURCE_FILE_COLUMN: {'type': ['string']},
        SDC_SOURCE_LINENO_COLUMN: {'type': ['integer']},
        SDC_SOURCE_LAST_MODIFIED: {'type': ['string'], 'format': 'date-time'},
        csv_handler.SDC_EXTRA_COLUMN: {'type': ['array'], 'items': {'type': 'string'}},
    }

    return {
        'type': 'object',
        'properties': data_schema,
    }


def sample_file(conn, table_spec, f, sample_rate, max_records, config):
    samples = []
    decryption_configs = config.get('decryption_configs')
    if decryption_configs:
        decryption_configs['key'] = AWS_SSM.get_decryption_key(
            decryption_configs.get('SSM_key_name'))
        file_handle, decrypted_name = conn.get_file_handle(f,
                                                           decryption_configs)
        f['filepath'] = decrypted_name
    else:
        file_handle = conn.get_file_handle(f)

    # Add file_name to opts and flag infer_compression to support gzipped files
    opts = {'key_properties': table_spec.get('key_properties',
            ['_sdc_source_file', '_sdc_source_lineno', '_sdc_source_last_modified']),
            'delimiter': table_spec.get('delimiter', ','),
            'file_name': f['filepath'],
            'encoding': table_spec.get('encoding', 'utf-8'),
            'sanitize_header': table_spec.get('sanitize_header', False),
            'skip_rows': table_spec.get('skip_rows', 0)}

    readers = csv_handler.get_row_iterators(file_handle, options=opts, infer_compression=True)

    for reader in readers:
        current_row = 0
        for row in reader:
            if (current_row % sample_rate) == 0:
                if row.get(csv_handler.SDC_EXTRA_COLUMN):
                    row.pop(csv_handler.SDC_EXTRA_COLUMN)
                samples.append(row)

            current_row += 1

            if len(samples) >= max_records:
                break

    # Empty sample to show field selection, if needed
    empty_file = False
    if len(samples) == 0:
        empty_file = True
        # Assumes all reader objects in readers have the same fieldnames
        samples.append({name: None for name in reader.fieldnames})

    return (empty_file, samples)


def sample_files(conn, table_spec, files, config,
                 sample_rate=1, max_records=1000, max_files=1):
    to_return = []
    empty_samples = []

    files_so_far = 0

    sorted_files = sorted(files, key=lambda f: f['last_modified'], reverse=True)

    for f in sorted_files:
        empty_file, samples = sample_file(conn, table_spec, f,
                                          sample_rate, max_records, config)

        if empty_file:
            empty_samples += samples
        else:
            to_return += samples

        files_so_far += 1

        if files_so_far >= max_files:
            break

    if not any(to_return):
        return empty_samples

    return to_return


def infer(datum):
    """
    Returns the inferred data type
    """
    if datum is None or datum == '':
        return None

    try:
        int(datum)
        return 'integer'
    except (ValueError, TypeError):
        pass

    try:
        # numbers are NOT floats, they are DECIMALS
        float(datum)
        return 'number'
    except (ValueError, TypeError):
        pass

    return 'string'


def count_sample(sample, type_summary, table_spec):
    """
        Generates a summary dict of each column and its inferred types

        {'Column1': {'string': 10}, 'Column2': {'integer': 10}}
    """
    for key, value in sample.items():
        if key not in type_summary:
            type_summary[key] = {}

        date_overrides = table_spec.get('date_overrides', [])
        if key in date_overrides:
            datatype = "date-time"
        else:
            datatype = infer(value)

        if datatype is not None:
            type_summary[key][datatype] = type_summary[key].get(datatype, 0) + 1

    return type_summary


def pick_datatype(type_count):
    """
    If the underlying records are ONLY of type `integer`, `number`,
    or `date-time`, then return that datatype.

    If the underlying records are of type `integer` and `number` only,
    return `number`.

    Otherwise return `string`.
    """
    to_return = 'string'

    if type_count.get('date-time', 0) > 0:
        return 'date-time'

    if len(type_count) == 1:
        if type_count.get('integer', 0) > 0:
            to_return = 'integer'
        elif type_count.get('number', 0) > 0:
            to_return = 'number'

    elif (len(type_count) == 2 and type_count.get('integer', 0) > 0 and type_count.get('number', 0) > 0): # noqa
        to_return = 'number'

    return to_return


def generate_schema(samples, table_spec):
    type_summary = {}
    for sample in samples:
        type_summary = count_sample(sample, type_summary, table_spec)

    schema = {}
    for key, value in type_summary.items():
        datatype = pick_datatype(value)

        if datatype == 'date-time':
            schema[key] = {
                'anyOf': [
                    {'type': ['null', 'string'], 'format': 'date-time'},
                    {'type': ['null', 'string']}
                ]
            }
        else:
            types = ['null', datatype]
            if datatype != 'string':
                types.append('string')
            schema[key] = {
                'type': types,
            }

    return schema
