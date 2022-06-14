# Run Jupyter
```bash
$ jupyter notebook --ip=* --allow_origin=*
```

# Install `mage_ai`
```bash
$ pip install git+https://github.com/mage-ai/mage-ai.git#egg=mage-ai
```

# Set custom host
```python
import os


os.environ['HOST'] = '0.0.0.0'
```
