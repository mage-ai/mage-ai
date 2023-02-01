# Facebook Ads

![Facebook](https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Facebook_Logo_%282019%29.svg/2560px-Facebook_Logo_%282019%29.svg.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value | Required |
| --- | --- | --- | --- |
| `account_id` | The Facebook Ad account ID use when extracting data. | `"abc123..."` (double quotes required) | ✅ |
| `access_token` | OAuth token to access API endpoints. | `abc123...` | ✅ |
| `start_date` | Fetch data that is newer than the `start_date`. | `2022-01-01T00:00:00Z` | ✅ |

<br />

### `account_id`

Go to https://www.facebook.com/adsmanager/manage/accounts and find your account ID.
It should look something like this: `13261011608127020`.

> Note
>
> Your account ID isn’t the same as your app ID.

### `access_token`

1. [Create an app](https://developers.facebook.com/docs/development/create-an-app/)
1. Get the access token
    1. Go to `https://developers.facebook.com/apps/[app_id]/marketing-api/tools`
        - Change `[app_id]` to the ID of the app you just created from the previous step.
    1. Under the section labeled <b>Select Token Permissions</b>, check all 3 boxes:
        - `ads_management`
        - `ads_read`
        - `read_insights`
    1. Click the button labeled <b>Get Token</b>.
1. Copy the `account_token`.

<br />

## Errors

### API rate limit

Read this [community thread](https://developers.facebook.com/community/threads/158172292247085/) for more information.

<br />
