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

### Prerequisites:
1. Google Analytics API needs to be enabled https://console.cloud.google.com/apis/dashboard
1. The service account needs to have access to the Google Analytics data.
1. Go to the dashboard: https://analytics.google.com/analytics
1. Click on Admin in the bottom left corner of the screen
1. Click on the Account Access Management section
1. Click on Property access management
1. Add the email address of the service account belonging to the credentials in the file at `path_to_credentials_json_file`

## Schema
Google Analytics schema contains two types of columns: [dimensions](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema#custom_dimensions) and [metrics](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema#custom_dimensions).

Limitations
* Maximum number of dimension columns allowed: 9 dimensions (https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/Dimension)
* Maximum number of metric columns allowed: 10 metrics (https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/Metric)
