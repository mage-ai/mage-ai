# Google Cloud Storage

<br />

## Config

You must enter the following credentials when configuring this source:

| Key                             | Description                                                                                                                                                                | Sample value                                |
|---------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| `path_to_credentials_json_file` | Google service account credential json file. If Mage is running on GCP, you can leave this value null and then Mage will use the instance service account to authenticate. | `/path/to/service_account_credentials.json` |
| `bucket`                        | Name of the google cloud storage bucket to save data in.                                                                                                                   | my_bucket                                   |
| `file_type`                     | The type of google cloud storage files. Supported file type values: `parquet`, `csv`                                                                                       | `parquet`                                   |
| `credentials_info`              | An alternative to specify the Google service account credentials.                                                                                                          | Structure is shown below                    | 
| `prefix`                        | A string prefix used to filter the blobs (objects) in your Google Cloud Storage bucket. Only blobs whose names start with this prefix will be considered.                  | sales_data_                                 | 

`credentials_info` structure:
```yaml
type: str
project_id: str
private_key_id: str
private_key: str
client_email: str
client_id: str
auth_uri: str
token_uri: str
auth_provider_x509_cert_url: str
client_x509_cert_url: str
universe_domain: str
```

<br />


### Get Started
1. [Enable the Google Cloud Storage API](https://console.cloud.google.com/flows/enableapi?apiid=storage-api.googleapis.com)
2. Create the service account. [Check out this guide](https://cloud.google.com/iam/docs/service-accounts-create)
3. Download your credentials file, and add it to your mage project.

Your account should have "Storage Admin" role for easy interactions with your bucket.
