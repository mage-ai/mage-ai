# Google Cloud Storage

![]()

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `bucket` | Name of the Google Cloud Storage bucket to save data in. | `user_generated_content` |
| `google_application_credentials` | Path of where is credential in json file. If Mage is running on GCP, you can leave this value null and then Mage will use the instance service account to authenticate. | `/path/to/your/service/account/key.json`
| `file_type` | The type of GCS files. Supported file type values: `parquet`, `csv`. | `parquet` or `csv` |
| `object_key_path` | The path of the location where you have files. Don’t include the `gs`, the bucket name, or the table name in this path value.  | `users/ds/20221225` |
| `date_partition_format` | (Optional) The datetime format of the partition. If it's null, files will not be saved into paratitions. | `null`, `%Y%m%d`, `%Y%m%dT%H` |

<br />
