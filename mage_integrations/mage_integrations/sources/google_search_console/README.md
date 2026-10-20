# Google Search Console

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `path_to_credentials_json_file` | Google service account credential json file. | `/path/to/service_account_credentials.json` |
| `email` | If you have delegated domain-wide access to the service account and you want to impersonate a user account, enter the user email. | `test@xyz.com` |
| `site_urls` | Website urls separated by comma. | `https://www.mage.ai, sc-domain:example.com` |
| `start_date` | The start date of google search console query. | `2022-01-01` |
<br />

Prerequisites:
* Google Search Console API needs to be enabled https://console.cloud.google.com/apis/dashboard
* The service account needs to have access to the Google Search Console data.
    * In Google Search Console page https://search.google.com/search-console, click "Settings", and then add your service account email to "Users and permissions" list.
