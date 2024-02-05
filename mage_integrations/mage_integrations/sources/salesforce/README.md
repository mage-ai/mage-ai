# Salesforce

![](https://user-images.githubusercontent.com/78053898/198753571-7c033641-75a2-4338-b257-ee37a159915e.png)

<br />

## Config

You must enter the following settings when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `api_type` | The `api_type` is used to switch the behavior of the tap between using Salesforce's "REST" and "BULK" APIs. When new fields are discovered in Salesforce objects, the `select_fields_by_default` key describes whether or not the tap will select those fields by default. | `REST`, `BULK` |
| `domain` | Your Salesforce instance domain. Use 'login' (default) or 'test' (sandbox), or Salesforce My domain.| `test`, `login`|
| `select_fields_by_default` | If `true`, the fields in a schema of a stream will all be selected by default when setting up a synchronization. | `true`, `false` |
| `start_date` | The `start_date` is used by the tap as a bound on SOQL queries when searching for records.  This should be this exact format `YYYY-mm-ddTHH:MM:SSZ`. | `2022-11-30T21:31:20Z` |

If using `OAuth` based authentication:
| Key | Description | Sample value
| --- | --- | --- |
| `client_id` | OAuth Salesforce App secrets. | `ABC1...` |
| `client_secret` | OAuth Salesforce App secrets. | `ABC1...` |
| `refresh_token` | The `refresh_token` is a secret created during the OAuth flow | `ABC1...` |

If using `Password` based authentication:
| Key | Description | Sample value
| --- | --- | --- |
| `username` | Salesforce account username | `ABC1...` |
| `password` | Salesforce account password | `ABC1...` |
| `security_token` | Salesforce account security token | `ABC1...` |

Optional settings:
| Key | Description | Sample value
| --- | --- | --- |
| `threshold` | When running `INCREMENTAL` sync runs, threshold is used to throttle how often STATE messages are generated (in `REST` api_type).This can be useful to minimize the amount of `STATE` messages being generated. | Defaults to 1000
| `streams` | List of stream names to be discovered inside the salesforce tap. if none is given, the tap will search for all avaliable streams, which can take several minutes. | ["Account"]

<br />

### How to get your `client_id`, `client_secret`, and `refresh_token`

#### Find your `client_id` and `client_secret`

1. Sign into your Salesforce account.
1. Create a <b>Connected App</b> and <b>Enable OAuth Settings for API Integration</b>
by following this [Salesforce documentation](https://help.salesforce.com/s/articleView?id=sf.connected_app_create_api_integration.htm&type=5).
    1. Use the following URL as the callback URL: https://login.salesforce.com/services/oauth2/success
1. When you are at the step to choose which OAuth Scopes to authorize, you must give your
Connected App at least these 2 scopes:
    1. Manage (`api`)
    1. Perform requests at any time (`refresh_token`)
1. After you created a <b>Connected App</b>, go to your <b>Setup</b> and click on the <b>Home</b> tab.
1. On the left sidebar under the <b>Platform tools > Apps > App Manager</b>, click on <b>App Manager</b>.
1. Find the row that contains the app you just created. On the furthest right column, click the dropdown caret icon and click <b>View</b>.
1. Under the <b>API (Enable OAuth Settings)</b> section, find the subsection labeled <b>Consumer Key and Secret</b> and click the button <b>Manage Consumer Details</b>.
1. A new page will open, displaying your <b>Consumer Key</b> (which is your `client_id`) and <b>Consumer Secret</b> (which is your `client_secret`).

#### Authorize your <b>Connected App</b>

1. Construct a URL with the following format:
`https://[your_salesforce_domain].my.salesforce.com/services/oauth2/authorize?client_id=[client_id]&redirect_uri=https://login.salesforce.com/services/oauth2/success&response_type=code`

| Variable | Description | Sample value |
| --- | --- | --- |
| `[your_salesforce_domain]` | The domain of your Salesforce account. | `mage-dev-ed` |
| `[client_id]` | Your <b>Consumer Key</b> | `ABC123...` |

2. Open that URL in a browser.
3. Authorize your <b>Connected App</b> to have API access to your Salesforce account.
4. Once you authorize, you’ll be redirect to a URL like this:
`https://login.salesforce.com/services/oauth2/success?code=[code]`.
5. Note the value of the `code` URL parameter, it’ll be used to get a `refresh_token`.

#### Get a `refresh_token`

Open a terminal and make the following POST request:

```bash
curl -X POST https://[your_salesforce_domain].my.salesforce.com/services/oauth2/token \
   -H "Content-Type: application/x-www-form-urlencoded"  \
   -d "grant_type=authorization_code&code=[code]&client_id=[client_id]&client_secret=[client_secret]&redirect_uri=https://login.salesforce.com/services/oauth2/success"
```

Change the following URL parameters to match your credentials:

| URL parameter | Description | Sample value |
| --- | --- | --- |
| `[your_salesforce_domain]` | The domain of your Salesforce account. | `mage-dev-ed` |
| `[code]` | The code you received after authorizing your <b>Connected App</b> | `ABC123...` |
| `[client_id]` | Your <b>Consumer Key</b> | `ABC123...` |
| `[client_secret]` | Your <b>Consumer Secret</b> | `ABC1...` |

Once you execute the above CURL command successfully,
you’ll receive a response that could look like this:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "signature": "...",
  "scope": "...",
  "id_token": "...",
  "instance_url": "https://[your_salesforce_domain].my.salesforce.com",
  "id": "https://login.salesforce.com/id/.../...",
  "token_type": "Bearer",
  "issued_at": ""
}
```

Take note of the `refresh_token`, it’ll be used when you configure this source.

### Additional resources in case you get lost

- https://stackoverflow.com/questions/12794302/salesforce-authentication-failing/29112224#29112224
- https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_oauth_and_connected_apps.htm
- https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm&type=5

<br />

## Schema

The available schema depends on the objects in your Salesforce account.

Some example schema can include the following (depending on your account):

- AIApplication
- AIApplicationConfig
- AIInsightAction
- AIInsightFeedback
- AIInsightReason
- AIInsightValue
- AIPredictionEvent
- AIRecordInsight
- AcceptedEventRelation
- Account
- ...
- WorkTypeFeed
- WorkTypeGroup
- WorkTypeGroupFeed
- WorkTypeGroupHistory
- WorkTypeGroupMember
- WorkTypeGroupMemberFeed
- WorkTypeGroupMemberHistory
- WorkTypeGroupShare
- WorkTypeHistory
- WorkTypeShare
- *and more...*

<br />
