# Paystack

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `start_date` | The date in ISO(YYYY-mm-ddTHH:MM:SSZ) format at which the tap will begin pulling data (for those resources that support this). If you select a bookmark property, it will prioritize the latest bookmark date over this field. | `2010-01-01T00:00:00Z` |
| `secret_key` | Secret key for your Paystack integration. | `fake_api_key...` |
| `request_timeout` | (Optional) Set timeout for requests to the Paystack API, defaults to 300 seconds | `300` |

<br />
