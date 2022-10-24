# Resources

- https://console.cloud.google.com/iam-admin/serviceaccounts/details/110089892115707683078
- https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries
- https://github.com/googleapis/python-analytics-data
    - https://github.com/googleapis/python-analytics-data/blob/main/google/analytics/data_v1beta/types/analytics_data_api.py#L164
- https://ga-dev-tools.web.app/ga4/query-explorer/

# Example

```python
from connections.google_analytics import GoogleAnalytics
import json


client = GoogleAnalytics(
    211168255,
    '/users/mage/mage-241122-6ca7fe21b556.json',
)

data = client.load(
    '2022-10-01',
    dimensions=[
        'city',
        'country',
    ],
    metrics=[
        'activeUsers',
        'newUsers',
        'sessions',
        'totalUsers',
    ],
)

print(json.dumps(data[:5], indent=2))
```
