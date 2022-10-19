# Amplitude

<img
  alt="Amplitude"
  src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Amplitude_logo.svg/5000px-Amplitude_logo.svg.png"
  width="300"
/>

## Config

You must enter the following credentials when configuring this source:

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

### [Events](https://www.docs.developers.amplitude.com/analytics/apis/export-api/#response-schema)

```json
{
 "server_received_time": UTC ISO-8601 formatted timestamp,
 "app": int,
 "device_carrier": string,
 "$schema":int,
 "city": string,
 "user_id": string,
 "uuid": UUID,
 "event_time": UTC ISO-8601 formatted timestamp,
 "platform": string,
 "os_version": string,
 "amplitude_id": long,
 "processed_time": UTC ISO-8601 formatted timestamp,
 "user_creation_time": UTC ISO-8601 formatted timestamp,
 "version_name": string,
 "ip_address": string,
 "paying": boolean,
 "dma": string,
 "group_properties": dict,
 "user_properties": dict,
 "client_upload_time": UTC ISO-8601 formatted timestamp,
 "$insert_id": string,
 "event_type": string,
 "library":string,
 "amplitude_attribution_ids": string,
 "device_type": string,
 "device_manufacturer": string,
 "start_version": string,
 "location_lng": float,
 "server_upload_time": UTC ISO-8601 formatted timestamp,
 "event_id": int,
 "location_lat": float,
 "os_name": string,
 "amplitude_event_type": string,
 "device_brand": string,
 "groups": dict,
 "event_properties": dict,
 "data": dict,
 "device_id": string,
 "language": string,
 "device_model": string,
 "country": string,
 "region": string,
 "is_attribution_event": bool,
 "adid": string,
 "session_id": long,
 "device_family": string,
 "sample_rate": null,
 "idfa": string,
 "client_event_time": UTC ISO-8601 formatted timestamp,
}

```
