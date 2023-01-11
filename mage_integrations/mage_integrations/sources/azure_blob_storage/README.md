# Amazon S3

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `connection_string` | AWS access key ID. | `BlobEndpoint=https://xxx.blob.core.windows.net/;yyyyyy&sig=testsig` |
| `container_name` | The name of the Blob storage container where the data is stored. | `testcontainer` |
| `prefix` | The path of the location where you have files. Don’t include the container name, or the table name in this path value.  | `users/ds/20221225` |

<br />
