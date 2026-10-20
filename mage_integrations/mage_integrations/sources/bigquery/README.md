# BigQuery

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `path_to_credentials_json_file` | Google service account credential json file. If Mage is running on GCP, you can leave this value null and then Mage will use the instance service account to authenticate. | `/path/to/service_account_credentials.json` |
| `dataset` | BigQuery dataset you want to read data from. | `example_dataset` |
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

<br />

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `batch_fetch_limit` | The number of rows to fetch in each batch (default to 50k). You can specify a larger batch size if your instance has higher memory. | `50000`

<br />

### Required permissions

Your BigQuery account should at least have the below permissiont to use the BigQuery source
```
bigquery.jobs.create
bigquery.readsessions.create
bigquery.readsessions.getData
```

Your account should also have "BigQuery Data Viewer" role for the BigQuery dataset you specified in the config.
