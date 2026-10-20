# LinkedIn Ads

![LinkedIn Ads](https://i0.wp.com/winatlinkedin.com/wp-content/uploads/2019/07/Linkedin-ad-management-2.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value | Required |
| --- | --- | --- | --- |
| `accounts` | ... | `"id1, id2, id3"` | Required if you want to sync the stream `accounts` or `account_users`. |
| `access_token` | ... | `def789...` | ✅ |
| `request_timeout` | ... | `300` |   |
| `start_date` | ... | `2023-01-01T00:00:00Z` | ✅ |
| `user_agent` | ... | `your_email@your_domain.com` | ✅ |

Instead of providing an `access_token`, you can add the following fields and values:

| Key | Description | Sample value | Required |
| --- | --- | --- | --- |
| `client_id` | ... | `abc123...` | ✅ |
| `client_secret` | ... | `xyz456...` | ✅ |
| `refresh_token` | ... | `def789...` | ✅ |

### How to get `access_token`

1. Create a LinkedIn app: https://www.linkedin.com/developers/apps
1. Enable the <b>Marketing Developer Platform</b> product: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access?context=linkedin%2Fcontext#marketing
1. Fill out the access form and submit it. Then, in a few business days you’ll be approved.
1. Once approved, get your access token by following these instructions: https://www.linkedin.com/developers/tools/oauth

<br />
