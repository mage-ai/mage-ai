# Chargebee

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `api_key` | API key for your Chargebee site. | `fake_api_key...` |
| `site` | Name of your Chargebee site (e.g. `mage` if your Chargebee site is "mage.chargebee.com"). Do not enter the entire Chargebee site url, just the name of the site. | `your-site-name` |
| `start_date` | The date in ISO(YYYY-mm-ddTHH:MM:SSZ) format at which the tap will begin pulling data (for those resources that support this). | `2010-01-01T00:00:00Z` |
| `include_deleted` | (Optional) If you want deleted records of all streams or not, defaults to True | `True` |
| `request_timeout` | (Optional) Set timeout for requests to the Chargebee API, defaults to 300 seconds | `300` |

<br />

## Streams

Here are all the streams supported in Chargebee source: https://github.com/mage-ai/mage-ai/tree/master/mage_integrations/mage_integrations/sources/chargebee/streams
