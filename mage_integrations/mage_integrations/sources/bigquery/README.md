# BigQuery

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `path_to_credentials_json_file` | Google service account credential json file. If Mage is running on GCP, you can leave this value null and then Mage will use the instance service account to authenticate. | `/path/to/service_account_credentials.json` |
| `dataset` | BigQuery dataset you want to read data from. | `example_dataset` |

<br />
