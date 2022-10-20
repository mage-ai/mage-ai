# Amplitude

<img
  alt="Amplitude"
  src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Amplitude_logo.svg/5000px-Amplitude_logo.svg.png"
  width="300"
/>

<br />

## Config

You must enter the following settings when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `api_key` | Amplitude project's unique API key. | `73bb...` |
| `secret_key` | Amplitude project's unique secret key. | `ABC1...` |

> Find your Amplitude Project API Credentials
>
> See Amplitude’s [documentation](https://www.docs.developers.amplitude.com/analytics/find-api-credentials/).

<br />

## Query

Loading data from Amplitude requires a start date and an end date.

Mage will automatically pass the start date and end date to Amplitude depending on the
scheduled trigger you create.

For example, if you create a scheduled trigger that runs daily, then on each pipeline run the
start date will be 1 day ago and the end date will be today’s date.

If you want to hardcode and customize the start date and end date,
follow these [instructions to override the runtime variables](../../../docs/production/runtime_variables.md)
for your pipeline.

Add the following keys and sample values to your pipeline’s variables:

| Key | Description | Sample value
| --- | --- | --- |
| `_start_date` | The date to start fetching events from Amplitude. | `2022-10-01` |
| `_end_date` | The date to stop fetching events from Amplitude. | `2022-10-03` |

<br />

## Schema

- [Events](https://www.docs.developers.amplitude.com/analytics/apis/export-api/#response-schema)

<br />
