import csv
import io
import re

from mage_integrations.sources.sftp.tap_sftp.singer_encodings import compression

SDC_EXTRA_COLUMN = "_sdc_extra"
SDC_META_COLUMNS = ['_sdc_source_file', '_sdc_source_lineno', '_sdc_source_last_modified']


def get_row_iterators(iterable, options={}, infer_compression=False):
    """Accepts an interable, options and a flag to infer compression and yields
    csv.DictReader objects which can be used to yield CSV rows."""
    if infer_compression:
        compressed_iterables = compression.infer(iterable, options.get('file_name'))
    for item in compressed_iterables:
        yield get_row_iterator(item, options=options)


def sanitize_colname(col_name):
    sanitized = re.sub(r'[^0-9a-zA-Z_]+', '_', col_name)
    prefixed = re.sub(r'^(\d+)', r'x_\1', sanitized)
    return prefixed.lower()


def get_row_iterator(iterable, options=None):
    """Accepts an interable, options and returns a csv.DictReader object
    which can be used to yield CSV rows."""
    options = options or {}

    for i in range(options.get('skip_rows', 0)):
        iterable.__next__()

    # Replace any NULL bytes in the line given to the DictReader
    reader = csv.DictReader(
        io.TextIOWrapper(iterable, encoding=options.get('encoding', 'utf-8')),
        fieldnames=None,
        restkey=SDC_EXTRA_COLUMN,
        delimiter=options.get('delimiter', ',')
    )

    if 'sanitize_header' in options and options['sanitize_header']:
        reader.fieldnames = [sanitize_colname(col) for col in reader.fieldnames].copy()

    headers = set(reader.fieldnames + SDC_META_COLUMNS)

    if options.get('key_properties'):
        key_properties = set(options['key_properties'])
        if not key_properties.issubset(headers):
            raise Exception('CSV file missing required headers: {}'
                            .format(key_properties - headers))

    if options.get('date_overrides'):
        date_overrides = set(options['date_overrides'])
        if not date_overrides.issubset(headers):
            raise Exception('CSV file missing date_overrides headers: {}'
                            .format(date_overrides - headers))
    return reader
