# Install `mage_ai`
```bash
$ pip install git+https://github.com/mage-ai/mage-ai.git#egg=mage-ai
```

# Run Jupyter
```bash
$ export HOST=0.0.0.0
$ jupyter notebook --ip=* --allow_origin=*
```

# Start app
```python
import mage_ai
from mage_ai.server.sample_datasets import load_dataset

from datetime import datetime


now = datetime.utcnow().timestamp()
mage_ai.connect_data(load_dataset('titanic_survival.csv'), name=f'titanic dataset {now}')
mage_ai.connect_data(load_dataset('salary_survey.csv'), name=f'salary survey {now}')

mage_ai.kill()
mage_ai.launch(iframe_host='18.237.55.91', iframe_port=5789)
```
