# Datadog

![Datadog](https://imgix.datadoghq.com/img/about/presskit/logo-v/dd_vertical_white.png?auto=format&fit=max&w=847)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value |
| --- | --- | --- |
| `api_key` | Datadog API key. | `abc123...` |
| `application_key` | Datadog application key | `def456...` |
| `start_date` | The date in ISO(YYYY-mm-ddTHH:MM:SSZ) format at which the tap will begin pulling data (for those resources that support this). If you select a bookmark property, it will prioritize the latest bookmark date over this field. | `2010-01-01T00:00:00Z` |
| `query` | Some datadog streams can perform a search with a `query` parameter. This can help narrow down the records returned from the API. Currently the streams that can take a `query` parameter are `audit_logs` and `logs`. | `query string...` |

To add a query for a certain stream, you need to make the stream name a key in the `query` config field, and the query string the value. Example:

```yaml
...
query:
    audit_logs: your query here...
```
<br />
