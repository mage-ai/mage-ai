# Azure Blob Storage

![Azure Blob Storage](https://user-images.githubusercontent.com/80284865/212203409-7f9660ba-abf1-4a1c-9e86-0d699ed04381.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `connection_string` | Storage account connection string. | `BlobEndpoint=https://xxx.blob.core.windows.net/;yyyyyy&sig=testsig` |
| `container_name` | The name of the Blob storage container where the data is stored. | `testcontainer` |
| `prefix` | The path of the location where you have files. Don’t include the container name, or the table name in this path value.  | `users/ds/20221225` |

<br />

## How to find connection string
* Option 1: Get connection string from storage account access keys: https://learn.microsoft.com/en-us/answers/questions/1071173/where-can-i-find-storage-account-connection-string
* Option 2: If you want to restict the access to the storage account resource, you can generate "Shared access signature" and get the connection string: https://learn.microsoft.com/en-us/azure/applied-ai-services/form-recognizer/create-sas-tokens?view=form-recog-3.0.0#create-your-sas-tokens
