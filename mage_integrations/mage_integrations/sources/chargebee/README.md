# Chargebee

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `api_key` | API key for your Chargebee site. | `fake_api_key...` |
| `site` | Name of your Chargebee site (e.g. https://{site}.chargebee.com/) | `your-site-name` |
| `start_date` | The date in ISO(YYYY-mm-ddTHH:MM:SSZ) format at which the tap will begin pulling data (for those resources that support this). | `2010-01-01T00:00:00Z` |
| `include_deleted` | (Optional) If you want deleted records of all streams or not, defaults to True | `True` |
| `request_timeout` | (Optional) Set timeout for requests to the Chargebee API, defaults to 300 seconds | `300` |

<br />
