from collections import OrderedDict
from typing import Dict, Generator, List

import singer
from singer.schema import Schema

import mage_integrations.sources.google_sheets.transform as internal_transform
from mage_integrations.connections.google_sheets import (
    GoogleSheets as GoogleSheetsConnection,
)
from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.utils.schema_helpers import extract_selected_columns

LOGGER = singer.get_logger()


class GoogleSheets(Source):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.connection = GoogleSheetsConnection(
            path_to_credentials_json_file=self.config['path_to_credentials_json_file'],
        )

    def discover(self, streams: List[str] = None) -> Catalog:
        if streams is None:
            streams = []

        catalog_entries = []

        spreadsheet_metadata = self.connection.get_spreadsheet_metadata(
            spreadsheet_id=self.config['spreadsheet_id'],
        )

        sheets = spreadsheet_metadata.get('sheets')
        if not sheets:
            return []

        # Loop through each worksheet in spreadsheet
        for sheet in sheets:
            sheet_title = sheet.get('properties', {}).get('title')
            if streams and sheet_title not in streams:
                # If the sheet title is not in selected stream ids, skip it
                continue

            # GET sheet_json_schema for each worksheet
            sheet_json_schema, columns = self.__get_sheet_metadata(
                sheet,
                self.config['spreadsheet_id'],
            )

            # SKIP empty sheets (where sheet_json_schema and columns are None)
            if sheet_json_schema and columns:
                sheet_title = sheet.get('properties', {}).get('title')
                schema = Schema.from_dict(sheet_json_schema)
                metadata = get_standard_metadata(
                    key_properties=['__google_sheet_row'],
                    replication_method=REPLICATION_METHOD_FULL_TABLE,
                    schema=schema.to_dict(),
                    stream_id=sheet_title,
                    valid_replication_keys=[],
                )
                catalog_entry = CatalogEntry(
                    key_properties=['__google_sheet_row'],
                    metadata=metadata,
                    replication_method=REPLICATION_METHOD_FULL_TABLE,
                    schema=schema,
                    stream=sheet_title,
                    tap_stream_id=sheet_title,
                    unique_conflict_method=UNIQUE_CONFLICT_METHOD_UPDATE,
                    unique_constraints=[],
                )

                catalog_entries.append(catalog_entry)

        return Catalog(catalog_entries)

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = None,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        # # get the stream object
        # stream_obj = stream_obj(client, config.get("spreadsheet_id"), config.get("start_date"))

        stream_name = stream.tap_stream_id
        self.logger.info(f'STARTED Syncing Sheet {stream_name}')

        columns = extract_selected_columns(stream.metadata)
        self.logger.info(f'Stream: {stream_name}, selected_fields: {columns}')

        spreadsheet_id = self.config['spreadsheet_id']
        spreadsheet_metadata = self.connection.get_spreadsheet_metadata(
            spreadsheet_id=self.config['spreadsheet_id'],
        )
        sheets = spreadsheet_metadata['sheets']
        sheet_metadata = [s for s in sheets if s.get('properties', {}).get('title') == stream_name]
        if not sheet_metadata:
            return
        sheet_metadata = sheet_metadata[0]
        sheet_id = sheet_metadata['properties']['sheetId']
        _, columns = self.__get_sheet_metadata(sheet_metadata, spreadsheet_id)

        # Determine max range of columns and rows for "paging" through the data
        sheet_last_col_index = 1
        sheet_last_col_letter = 'A'
        for col in columns:
            col_index = col.get('columnIndex')
            col_letter = col.get('columnLetter')
            if col_index > sheet_last_col_index:
                sheet_last_col_index = col_index
                sheet_last_col_letter = col_letter
        sheet_max_row = sheet_metadata.get('properties').get('gridProperties', {}).get('rowCount')

        # Initialize paging for 1st batch
        is_last_row = False
        batch_rows = 10000
        from_row = 2
        if sheet_max_row < batch_rows:
            to_row = sheet_max_row
        else:
            to_row = batch_rows

        # Loop through batches (each having 200 rows of data)
        while not is_last_row and from_row < sheet_max_row and to_row <= sheet_max_row:
            range_rows = 'A{}:{}{}'.format(from_row, sheet_last_col_letter, to_row)
            value_range = f"'{stream_name}'!{range_rows}"
            opts = {
                'dateTimeRenderOption': 'SERIAL_NUMBER',
                'valueRenderOption': 'FORMATTED_VALUE',
                'majorDimension': 'ROWS',
            }
            # GET sheet_data for a worksheet tab
            sheet_data = self.connection.load(
                spreadsheet_id=spreadsheet_id,
                value_range=value_range,
                opts=opts,
            )
            opts = {
                'dateTimeRenderOption': 'SERIAL_NUMBER',
                'valueRenderOption': 'UNFORMATTED_VALUE',
                'majorDimension': 'ROWS',
            }
            unformatted_sheet_data = self.connection.load(
                spreadsheet_id=spreadsheet_id,
                value_range=value_range,
                opts=opts,
            )

            # Transform batch of rows to JSON with keys for each column
            sheet_data_transformed, row_num = internal_transform.transform_sheet_data(
                spreadsheet_id=spreadsheet_id,
                sheet_id=sheet_id,
                sheet_title=stream_name,
                from_row=from_row,
                columns=columns,
                sheet_data_rows=sheet_data,
                unformatted_rows=unformatted_sheet_data,
            )

            # If a whole blank page found, then stop looping.
            if not sheet_data:
                is_last_row = True

            yield sheet_data_transformed

            # Update paging from/to_row for next batch
            from_row = to_row + 1
            if to_row + batch_rows > sheet_max_row:
                to_row = sheet_max_row
            else:
                to_row = to_row + batch_rows

    def test_connection(self):
        self.connection.connect()

    def __colnum_string(self, num):
        """
        Convert column index to column letter
        """
        string = ""
        while num > 0:
            num, remainder = divmod(num - 1, 26)
            string = chr(65 + remainder) + string
        return string

    def __pad_default_effective_values(self, headers, first_values):
        for _ in range(len(headers) - len(first_values)):
            first_values.append(OrderedDict())

    def __get_sheet_metadata(self, sheet, spreadsheet_id):
        """
        Retrieves metadata for a given sheet in a Google Spreadsheet.

        Args:
            sheet (dict): The metadata of the sheet obtained from the Google Sheets API.
            spreadsheet_id (str): The ID of the Google Spreadsheet containing the sheet.

        Returns:
            tuple: A tuple containing the JSON schema representing the sheet's data
                   structure for discovery/catalog purposes and a list of column names.
                   Returns (None, None) if the sheet is malformed or inaccessible.

        Raises:
            Any exceptions raised during the process are logged as warnings, and
            the function attempts to proceed. If the sheet is malformed or
            inaccessible, it logs a warning and returns (None, None).
        """
        sheet_id = sheet.get('properties', {}).get('sheetId')
        sheet_title = sheet.get('properties', {}).get('title')
        self.logger.info(f'Get sheet metadata sheet_id = {sheet_id}, sheet_title = {sheet_title}')

        sheet_metadata = self.connection.get_spreadsheet_metadata(
            spreadsheet_id=spreadsheet_id,
            sheet_title=sheet_title,
        ).get('sheets')[0]

        # Create sheet_json_schema (for discovery/catalog) and columns (for sheet_metadata results)
        try:
            sheet_json_schema, columns = self.__get_sheet_schema_columns(sheet_metadata)
        except Exception as err:
            self.logger.warning(f'{err}')
            self.logger.warning(f'SKIPPING Malformed sheet: {sheet_title}')
            sheet_json_schema, columns = None, None

        return sheet_json_schema, columns

    def __get_sheet_schema_columns(self, sheet):
        sheet_title = sheet.get('properties', {}).get('title')
        sheet_json_schema = OrderedDict()
        data = next(iter(sheet.get('data', [])), {})
        row_data = data.get('rowData', [])
        if row_data == [] or len(row_data) == 1:
            # Empty sheet or empty first row, SKIP
            self.logger.info(f'SKIPPING Empty Sheet: {sheet_title}')
            return None, None

        # spreadsheet is an OrderedDict, with orderd sheets and rows in the repsonse
        headers = row_data[0].get('values', [])
        first_values = row_data[1].get('values', [])
        # Pad first row values with default if null
        if len(first_values) < len(headers):
            self.__pad_default_effective_values(headers, first_values)

        sheet_json_schema = {
            'type': 'object',
            'additionalProperties': False,
            'properties': {
                '__google_spreadsheet_id': {
                    'type': ['null', 'string']
                },
                '__google_sheet_id': {
                    'type': ['null', 'integer']
                },
                '__google_sheet_row': {
                    'type': ['null', 'integer']
                }
            }
        }

        # used for checking uniqueness
        header_list = []
        columns = []
        prior_header = None
        i = 0
        skipped = 0

        # if no headers are present, log the message that sheet is skipped
        if not headers:
            self.logger.warning(f'SKIPPING THE SHEET AS HEADERS ROW IS EMPTY. SHEET: {sheet_title}')

        # Read column headers until end or 2 consecutive skipped headers
        for header in headers:
            # LOGGER.info('header = {}'.format(json.dumps(header, indent=2, sort_keys=True)))
            column_index = i + 1
            column_letter = self.__colnum_string(column_index)
            header_value = header.get('formattedValue')
            if header_value:
                # if the column is NOT to be skipped
                column_is_skipped = False
                skipped = 0
                column_name = '{}'.format(header_value)
                if column_name in header_list:
                    raise Exception('DUPLICATE HEADER ERROR: SHEET: {}, COL: {}, CELL: {}1'.format(
                        sheet_title, column_name, column_letter))
                header_list.append(column_name)

                first_value = None
                try:
                    first_value = first_values[i]
                except IndexError as err:
                    self.logger.info(f'NO VALUE IN 2ND ROW FOR HEADER. SHEET: {sheet_title}, '
                                     f'COL: {column_name}, CELL: {column_letter}2. {err}')
                    first_value = {}
                    first_values.append(first_value)
                    pass

                column_effective_value = first_value.get('effectiveValue', {})

                if column_effective_value == {}:
                    if ("numberFormat" in first_value.get('effectiveFormat', {})):
                        column_effective_value_type = "numberValue"
                    else:
                        column_effective_value_type = 'stringValue'
                        self.logger.info(
                            'WARNING: NO VALUE IN 2ND ROW FOR HEADER. SHEET: '
                            f'{sheet_title}, COL: {column_name}, CELL: {column_letter}2.')
                        self.logger.info('   Setting column datatype to STRING')
                else:
                    for key, _ in column_effective_value.items():
                        if key in ('numberValue', 'stringValue', 'boolValue'):
                            column_effective_value_type = key
                        elif key in ('errorType', 'formulaType'):
                            raise Exception(
                                f'DATA TYPE ERROR 2ND ROW VALUE: SHEET: {sheet_title}, COL: '
                                f'{column_name}, CELL: {column_letter}2, TYPE: {key}')

                column_number_format = first_values[i].get('effectiveFormat', {}).get(
                    'numberFormat', {})
                column_number_format_type = column_number_format.get('type')

                # Determine datatype for sheet_json_schema
                #
                # column_effective_value_type = numberValue, stringValue, boolValue;
                #  INVALID: errorType, formulaType
                #  https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ExtendedValue
                #
                # column_number_format_type = UNEPECIFIED, TEXT, NUMBER, PERCENT, CURRENCY, DATE,
                #   TIME, DATE_TIME, SCIENTIFIC
                #  https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#NumberFormatType
                #

                if column_effective_value_type == 'stringValue':
                    col_properties = {'type': ['null', 'string']}
                    column_gs_type = 'stringValue'
                elif column_effective_value_type == 'boolValue':
                    col_properties = {'type': ['null', 'boolean', 'string']}
                    column_gs_type = 'boolValue'
                elif column_effective_value_type == 'numberValue':
                    if column_number_format_type == 'DATE_TIME':
                        col_properties = {
                            'type': ['null', 'string'],
                            'format': 'date-time'
                        }
                        column_gs_type = 'numberType.DATE_TIME'
                    elif column_number_format_type == 'DATE':
                        col_properties = {
                            'type': ['null', 'string'],
                            'format': 'date'
                        }
                        column_gs_type = 'numberType.DATE'
                    elif column_number_format_type == 'TIME':
                        col_properties = {
                            'type': ['null', 'string'],
                            'format': 'time'
                        }
                        column_gs_type = 'numberType.TIME'
                    elif column_number_format_type == 'TEXT':
                        col_properties = {'type': ['null', 'string']}
                        column_gs_type = 'stringValue'
                    elif column_number_format_type == 'CURRENCY':
                        col_properties = {'type': ['null', 'string']}
                        column_gs_type = 'stringValue'
                    else:
                        # Interesting - order in the anyOf makes a difference.
                        # Number w/ singer.decimal must be listed last, otherwise errors occur.
                        col_properties = {
                            'type': ['null', 'string', 'integer'],
                            'format': 'singer.decimal'
                        }
                        column_gs_type = 'numberType'
                # Catch-all to deal with other types and set to string
                # column_effective_value_type: formulaValue, errorValue, or other
                else:
                    col_properties = {'type': ['null', 'string']}
                    column_gs_type = 'unsupportedValue'
                    self.logger.info(
                        f'WARNING: UNSUPPORTED 2ND ROW VALUE: SHEET: {sheet_title}, '
                        f'COL: {column_name}, CELL: {column_letter}2, TYPE: '
                        f'{column_effective_value_type}',
                    )
                    self.logger.info('Converting to string.')
            else:
                # if the column is to be skipped
                column_is_skipped = True
                skipped = skipped + 1
                column_index_str = str(column_index).zfill(2)
                column_name = '__google_sheet_skip_col_{}'.format(column_index_str)
                # unsupported field description if the field is to be skipped
                col_properties = {
                    'type': ['null', 'string'],
                    'description': 'Column is unsupported and would be skipped because header is '
                                   'not available',
                }
                column_gs_type = 'stringValue'
                self.logger.info(
                    f'WARNING: SKIPPED COLUMN; NO COLUMN HEADER. SHEET: {sheet_title}, ',
                    f'COL: {column_name}, CELL: {column_letter}1',
                )
                self.logger.info('  This column will be skipped during data loading.')

            if skipped >= 2:
                # skipped = 2 consecutive skipped headers
                # Remove prior_header column_name
                # stop scanning the sheet and break
                sheet_json_schema['properties'].pop(prior_header, None)
                # prior index is the index of the column prior to the currently column
                prior_index = column_index - 1
                # added a new boolean key `prior_column_skipped` to check if the column is
                # one of the two columns with consecutive headers as due to consecutive empty
                # headers both the columns should not be included in the schema as well as the
                # metadata
                columns[prior_index - 1]['prior_column_skipped'] = True
                self.logger.info(
                    f'TWO CONSECUTIVE SKIPPED COLUMNS. STOPPING SCAN AT: SHEET: {sheet_title}, '
                    f'COL: {column_name}, CELL {column_letter}1')
                break

            else:
                # skipped < 2 prepare `columns` dictionary with index, letter, column name, column
                # type and if the column is to be skipped or not for each column in the list
                column = {}
                column = {
                    'columnIndex': column_index,
                    'columnLetter': column_letter,
                    'columnName': column_name,
                    'columnType': column_gs_type,
                    'columnSkipped': column_is_skipped
                }
                columns.append(column)

                if column_gs_type in {
                        'numberType.DATE_TIME', 'numberType.DATE', 'numberType.TIME', 'numberType'}:
                    col_properties = {
                        'anyOf': [
                            col_properties,
                            # all the date, time has string types in schema
                            {'type': ['null', 'string']},
                        ]
                    }
                # add the column properties in the `properties` in json schema for the respective
                # column name
                sheet_json_schema['properties'][column_name] = col_properties

            prior_header = column_name
            i = i + 1

        return sheet_json_schema, columns


if __name__ == '__main__':
    main(GoogleSheets)
