# GCS (Google Cloud Storage)

![](https://storage.googleapis.com/gweb-cloudblog-publish/images/gcs-glossary-2x_v1.max-1000x1000.png)

<br />

## Config

You must enter the following credentials when configuring this destination:

| Key | Description | Sample value |
| --- | --- | --- |
| `bucket` | Name of the Google Cloud Storage bucket to save data in. | `user-generated-content` |
| `file_type` | The type of Google Cloud Storage files. Supported file type values: `parquet`, `csv`. | `parquet` or `csv` (default: `csv`) |
| `object_key_path` | The path of the location where you have files. Don’t include the bucket name or the table name in this path value. | `users/ds/20221225` |
| `region` | Region where the bucket is located. | `us-west1` (default value) |
| `date_partition_format` | (Optional) The datetime format of the partition. If it's null, files will not be saved into partitions. | `null`, `%Y%m%d`, `%Y%m%dT%H` (default: `null`) |
| `service_account_json` | Path to service account JSON file. | `/path/to/service_account.json` |

<br />
