# Slack

Get status updates in your Slack channel.

<img
  alt="Slack"
  src="https://d34u8crftukxnk.cloudfront.net/slackpress/prod/sites/6/2019-01_BrandRefresh_Old-to-New-Final.gif"
  width="300"
/>

## Overview of steps

1. Set up webhooks for Slack
1. Update Mage project settings

<br />

## Set up webhooks for Slack

Follow these [instructions on Slack](https://slack.com/help/articles/115005265063-Incoming-webhooks-for-Slack)
to setup incoming webhooks for your workspace.

<br />

## Update Mage project settings

Once you’ve set up webhooks for Slack, you should have a webhook URL that Slack provides.

Here is an example webhook (yours may vary):

```
https://hooks.slack.com/services/T01XXXXRKMJ/B04XXXXGY67/1UgUkao8pXXXXPmsuXXXX2lk
```

Follow these steps to add that webhook URL to your project settings:

1. Open the Mage tool in your browser (e.g. http://localhost:6789/).
1. Open a pipeline and start editing it (e.g. http://localhost:6789/pipelines/example_pipeline/edit).
1. In your left sidebar in the file browser, scroll all the way down and click on a file
named `metadata.yaml`.
1. In the `metadata.yaml` file, add the following values:
```yaml
notification_config:
  slack_config:
    webhook_url: ...
```
1. Change the `webhook_url` value to be the webhook URL you created from Slack.

<br />

## What next?

Whenever a pipeline run is successfully completed or fails,
a Slack message will appear in the channel you configured the webhook URL for.

Here is an example of what that message could look like:

| |
| --- |
| ![Slack](https://github.com/mage-ai/assets/blob/main/third-party/slack-message-run-alert.jpg?raw=true) |

<br />
