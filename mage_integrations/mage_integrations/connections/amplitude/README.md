# Example

```python
from connections.amplitude import Amplitude
from datetime import datetime, timedelta
import json


source = Amplitude('api_key', 'secret_key')
results = source.load(datetime.now() - timedelta(days=1))

for r in results[:5]:
    print(json.dumps(r, indent=2))
```
