# Front

![Front](https://user-images.githubusercontent.com/80284865/215037433-f8b9e0f6-01e8-4fab-ac2e-f1a191c78103.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `token` | The API token of Front app. | `abc123` |
| `start_date` | Used for `analytics` stream. Fetch data that is newer than the `start_date`. | `2023-01-01T00:00:00Z` |
| `end_date` | Used for `analytics` stream. Fetch data that is older than the `end_date`. If it's null, use current date as end_date. | `2023-01-05T00:00:00Z` |
| `incremental_range` | Used for `analytics` stream. The incremental extract date ranges, `daily` or `hourly`. | `daily`, `hourly` |

<br />

## How to get your `token`

Follow [Front's documentation](https://dev.frontapp.com/docs/create-and-revoke-api-tokens#create-an-api-token)
to get your API token.

<br />
