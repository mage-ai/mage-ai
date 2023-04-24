# Twitter Ads

![Twitter Ads](https://user-images.githubusercontent.com/80284865/233933127-e360397e-5997-4b16-9df3-6363a62809a7.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `start_date` | Absolute beginning date for bookmarked endpoints. | `2023-01-01T00:00:00Z` |
| `consumer_key` | [OAuth 1.0a](https://developer.twitter.com/en/docs/authentication/oauth-1-0a) credentials. | `YOUR_TWITTER_ADS_CONSUMER_KEY` |
| `consumer_secret` | [OAuth 1.0a](https://developer.twitter.com/en/docs/authentication/oauth-1-0a) credentials. | `YOUR_TWITTER_ADS_CONSUMER_SECRET` |
| `access_token` | [OAuth 1.0a](https://developer.twitter.com/en/docs/authentication/oauth-1-0a) credentials. | `YOUR_TWITTER_ADS_ACCESS_TOKEN` |
| `access_token_secret` | [OAuth 1.0a](https://developer.twitter.com/en/docs/authentication/oauth-1-0a) credentials. | `YOUR_TWITTER_ADS_ACCESS_TOKEN_SECRET` |
| `account_ids` | Comma-delimited list of Twitter Ad Account IDs. | `id1, id2, id3` |
| `attribution_window` | Number of days for latency look-back period to allow analytical reporting numbers to stabilize. | `14` |
| `with_deleted` | `true` or `false`; specifies whether to include logically deleted records in the results. | `true` |
| `country_codes` | Comma-delimited list of ISO 2-letter country codes for targeting and segmenttation. | `US, CA, MX, DE` |
| `page_size` | An optional parameter to configure custom page_size. | `1000` |
| `reports` | Object array of specified reports with name, entity, segment, and granularity. | `[{"name": "campaigns_genders_hourly_report", "enitity": "CAMPAIGN", "segment": "GENDER", "granularity": "HOUR"}]` |
| `request_timeout` | To configure the read and connect timeout for twitter-ads client. Default is 300 seconds. | `300` |

<br />

## Get access to the Twitter Ads API
To use the Twitter Ads source, you'll need to get access to the Twitter Ads API first. Follow [this guide](https://developer.twitter.com/en/docs/twitter-ads-api/getting-started) to get the access.
