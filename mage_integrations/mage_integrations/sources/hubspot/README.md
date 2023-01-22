# HubSpot

![HubSpot](https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/HubSpot_Logo.svg/2560px-HubSpot_Logo.svg.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value |
| --- | --- | --- |
| `access_token` | Secret access token used to make authenticated API requests. | `my_token` |
| `disable_collection` | If `false`, disable collection of anonymous usage metrics. | `false` |
| `request_timeout` | How long a request should wait to get a response. | `300` |
| `start_date` | A cutoff date for syncing historical data. | `2023-01-01T00:00:00Z` |

<br />

## How to get `access_token`

Follow HubSpot’s [documentation](https://developers.hubspot.com/docs/api/private-apps).

### Scopes

Select all the `Read` scopes (except `crm.objects.feedback_submissions`) under the section <b>CRM</b>.

#### CRM

| Scope | Read |
| --- | --- |
| `crm.lists` | ✅ |
| `crm.objects.companies` | ✅ |
| `crm.objects.contacts` | ✅ |
| `crm.objects.custom` | ✅ |
| `crm.objects.deals` | ✅ |
| `crm.objects.line_items` | ✅ |
| `crm.objects.marketing_events` | ✅ |
| `crm.objects.owners` | ✅ |
| `crm.objects.quotes` | ✅ |
| `crm.schemas.companies` | ✅ |
| `crm.schemas.contacts` | ✅ |
| `crm.schemas.custom` | ✅ |
| `crm.schemas.deals` | ✅ |
| `crm.schemas.line_items` | ✅ |
| `crm.schemas.quotes` | ✅ |

<br />
