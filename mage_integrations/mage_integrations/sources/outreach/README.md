# Outreach

![Outreach](https://lever-client-logos.s3.amazonaws.com/a8587b80-ef40-42f9-bc60-90ed6d34321d-1533317789481.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value | Required |
| --- | --- | --- | --- |
| `client_id` | ... | `abc123...` | ✅ |
| `client_secret` | ... | `xyz456...` | ✅ |
| `page_size` | ... | ... |   |
| `quota_limit` | ... | ... |   |
| `redirect_uri` | ... | `https://www.mage.ai` | ✅ |
| `refresh_token` | ... | `def789...` | ✅ |
| `start_date` | A cutoff date for syncing historical data. | `2023-01-01T00:00:00Z` | ✅ |

### How to get `refresh_token`

Follow [Outreach’s instructions](https://api.outreach.io/api/v2/docs).

#### Get `code`

https://api.outreach.io/oauth/authorize?client_id=<Application_Identifier>&redirect_uri=<Application_Redirect_URI>&response_type=code&scope=<Scope1+Scope2+Scope3>

Sample URL:

```
https://accounts.outreach.io/oauth/authorize?client_id=...&redirect_uri=https%3A%2F%2Fwww.mage.ai&response_type=code&scope=accounts.read+calls.read+duties.read+events.read+mailboxes.read+mailings.read+opportunities.read+personas.read+prospects.read+sequences.read+stages.read+tasks.read+teams.read+users.read
```

#### Exchange `code` for `refresh_token`

```curl
curl https://api.outreach.io/oauth/token \
  -X POST \
  -d client_id=<Application_Identifier> \
  -d client_secret=<Application_Secret> \
  -d redirect_uri=<Application_Redirect_URI> \
  -d grant_type=authorization_code \
  -d code=<Authorization_Code>
```

Sample response:
```json
{
  "access_token": <Access_Token>,
  "token_type": "bearer",
  "expires_in": 7200,
  "refresh_token": <Refresh_Token>,
  "scope": <Scope1+Scope2+Scope3>,
  "created_at": 1503301100
}
```

<br />

## Streams

### Prospects

The column `contactHistogram` in the stream `prospects` have been removed because the
column type (array of arrays) isn’t supported in destinations at the moment.

<br />
