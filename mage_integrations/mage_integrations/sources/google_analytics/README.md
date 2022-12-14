# Google Analytics

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `path_to_credentials_json_file` | Google service account credential json file. | `/path/to/service_account_credentials.json` |
| `property_id` | Property is a numeric Google Analytics GA4 Property identifier. To learn more, see [where to find your Property ID](https://developers.google.com/analytics/devguides/reporting/data/v1/property-id). | `12345678` |
| `start_date` | The start date of google analytics query. | `2022-01-01` |
| `end_date` | The end date of google analytics query. | `2022-01-01` |
<br />

Prerequisites:
* Google Analytics API needs to be enabled https://console.cloud.google.com/apis/dashboard
* The service account needs to have access to the Google Analytics data.
