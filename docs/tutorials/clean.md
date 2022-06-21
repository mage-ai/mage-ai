# Clean

### 3. Cleaning data
After building a data cleaning pipeline from the UI,
you can clean your data anywhere you can execute Python code:

```python
import mage_ai
from mage_ai.sample_datasets import load_dataset


df = load_dataset('titanic_survival.csv')

# Option 1: Clean with pipeline uuid
df_cleaned = mage_ai.clean(df, pipeline_uuid='uuid_of_cleaning_pipeline')

# Option 2: Clean with pipeline config directory path
df_cleaned = mage_ai.clean(df, pipeline_config_path='/path_to_pipeline_config_dir')
```
