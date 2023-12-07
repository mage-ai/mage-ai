# BigQuery

<br />

## Config

You must enter the following credentials when configuring this destination:

| Key | Description | Sample value
| --- | --- | --- |
| `path_to_credentials_json_file` | Google service account credential json file. If Mage is running on GCP, you can leave this value null and then Mage will use the instance service account to authenticate.  | `/path/to/service_account_credentials.json` |
| `project_id` | Google cloud project ID. | `example_project` |
| `dataset` | BigQuery dataset you want to export data to. | `example_dataset` |
| `location` | (Optional) BigQuery location of dataset, the BigQuery client will infer a location by default. | us-west1
| `disable_update_column_types` | If `false` and an existing column has a different column type than the schema, the existing column type will be altered to match the column type in the schema. | `false` (default value) |
| `use_batch_load` | (In beta) Instruct the BigQuery destination to use BigQuery load jobs instead of the query API. If you encounter any issues with batch loading, let us know in the [community slack](https://www.mage.ai/chat). | `true` (default value) |
| `credentials_info` | An alternative to specify the Google service account credentials. | Structure is shown below |


`credentials_info` structure:
```yaml
auth_provider_x509_cert_url: str
auth_uri: str
client_email: str
client_id: str
client_x509_cert_url: str
private_key: str
private_key_id: str
project_id: str
token_uri: str
type: str
```

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `skip_schema_creation` | If `true`, Mage won't run CREATE SCHEMA command. For more information, see this [issue](https://github.com/mage-ai/mage-ai/issues/3416) | `true` |
| `lower_case` | If `true`, Mage will set all columns name as lower case. Default is `true` | `true` |
| `allow_reserved_words` | If `true`, Mage will ignore SQL reserved words. Default is `false`| `true`, `false`|
<br />

<br />
