## TLDR
Mage is an open-source data management platform
that helps you
<span style="text-decoration: underline"><b>clean data</b></span> and
prepare it for training AI/ML models.

## What does this do?
The current version of Mage includes a data cleaning UI tool that can run locally on your laptop or
can be hosted in your own cloud environment.

## Why should I use it?
Using a data cleaning tool enables you to quickly visualize data quality issues,
easily fix them, and create repeatable data cleaning pipelines that can be used in
production environments (e.g. online re-training, inference, etc).

## Quick start

#### Install library
```bash
$ pip install git+https://github.com/mage-ai/mage-ai.git
```

#### Launch tool
Load your data, connect it to Mage, and launch the tool locally.


From anywhere you can execute Python code (e.g. terminal, Jupyter notebook, etc.),
run the following:

```python
import mage_ai
import pandas as pd


df = pd.read_csv('/path_to_data')
mage_ai.connect_data(df, name='name_of_dataset')
mage_ai.launch()
```

Open [http://localhost:5000](http://localhost:5000) in your browser to access the tool locally.

#### More resources

- Here is a [step-by-step](docs/tutorials/quick-start.md) guide on how to use the tool.
- Check out the [tutorials](docs/tutorials/README.md) to quickly become a master of magic.
