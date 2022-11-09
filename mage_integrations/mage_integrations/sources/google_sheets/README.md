# Google Sheets

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `path_to_credentials_json_file` | Google service account credential json file. | `/path/to/service_account_credentials.json` |
| `spreadsheet_id` | The unique identifier of a spreadsheet. You can find it in the spreadsheet URL after `/spreadsheets/d/` | `abcdefg123456` |

<br />

Prerequisites:
* Enable Google Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com
* Give service account Editor or Viewer permission by adding service account's email to your spreadsheet.
