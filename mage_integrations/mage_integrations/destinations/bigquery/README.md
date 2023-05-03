# BigQuery

<br />

## Config

You must enter the following credentials when configuring this destination:

| Key | Description | Sample value
| --- | --- | --- |
| `path_to_credentials_json_file` | Google service account credential json file. | `/path/to/service_account_credentials.json` |
| `project_id` | Google cloud project ID. | `example_project` |
| `dataset` | BigQuery dataset you want to export data to. | `example_dataset` |
| `location` | (Optional) BigQuery location of dataset, the BigQuery client will infer a location by default. | us-west1
| `disable_update_column_types` | If `false` and an existing column has a different column type than the schema, the existing column type will be altered to match the column type in the schema. | `false` (default value) |
| `use_batch_load` | (In beta) Instruct the BigQuery destination to use BigQuery load jobs instead of the query API. If you encounter any issues with batch loading, let us know in the [community slack](https://www.mage.ai/chat). | `false` (default value) |

<br />
