# Google Sheets

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `path_to_credentials_json_file` | Google service account credential json file. | `/path/to/service_account_credentials.json` |
| `spreadsheet_id` | The unique identifier of a spreadsheet. You can find it in the spreadsheet URL after `/spreadsheets/d/` | `abcdefg123456` |
| `selected_sheet_names` | A list of sheet names to filter by | `["sheet1", "sheet2"]` |

<br />

Prerequisites:
* Enable Google Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com
* Give service account Editor or Viewer permission by adding service account's email to your spreadsheet.

We expect each sheet's data to meet the following requirements
* Sheet is not empty.
* The first row contains the column names. There're no duplicate column names in the first row.
* The following rows contain the values. The values are not [errorType or formulaType](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ExtendedValue).
