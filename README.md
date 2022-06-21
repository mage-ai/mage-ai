[![PyPi](https://img.shields.io/pypi/v/mage-ai?color=orange)](https://pypi.org/project/mage-ai/)
[![mage-ai](https://img.shields.io/circleci/build/gh/mage-ai/mage-ai?color=%23159946&label=CircleCI&logo=circleci)](https://app.circleci.com/pipelines/github/mage-ai/mage-ai?branch=master&filter=all)
[![License](https://img.shields.io/github/license/mage-ai/mage-ai?color=red)](https://opensource.org/licenses/Apache-2.0)
[![Join Slack](https://img.shields.io/badge/Slack-Join%20Slack-blueviolet?logo=slack)](https://join.slack.com/t/mageai/shared_invite/zt-1adn34w4m-t~TcnPTlo3~5~d_0raOp6A)
[![Try In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1Pc6dpAolwuSKuoOEpWSWgx6MbNraSMVE?usp=sharing)

# Intro

Mage is an open-source data management platform
that helps you
<b>clean data</b> and
prepare it for training AI/ML models.

<kbd>
  <img
    alt="Mage demo"
    src="media/quick-demo.gif"
  />
</kbd>

<br />
<br />

> Join us on
> **[<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)**

**Table of contents**

1. [Quick start](#%EF%B8%8F-quick-start)
1. [Features](#-features)
1. [Roadmap](#%EF%B8%8F-roadmap)
1. [Contributing](#%EF%B8%8F-contributing)
1. [Community](#-community)

# 🏃‍♀️ Quick start

- Try a **[demo of Mage](https://colab.research.google.com/drive/1Pc6dpAolwuSKuoOEpWSWgx6MbNraSMVE?usp=sharing)** in Google Colab.
- Try a **[hosted version of Mage](http://18.237.55.91:5789/)**

<img alt="Fire mage" height="160" src="media/mage-fire-charging-up.svg" />

### 1. Install Mage
```bash
$ pip install mage-ai
```

### 2. Load and connect data
```python
import mage_ai
from mage_ai.sample_datasets import load_dataset


df = load_dataset('titanic_survival.csv')
mage_ai.connect_data(df, name='titanic dataset')
```

### 3. Launch tool
```python
mage_ai.launch()
```

Open [http://localhost:5789](http://localhost:5789) in your browser to access the tool locally.

If you’re launching Mage in a notebook, the tool will render in an iFrame.

### 4. Clean data
After building a data cleaning pipeline from the UI,
you can clean your data anywhere you can execute Python code:

```python
mage_ai.clean(df, pipeline_uuid='pipeline name')
```

## Demo video (2 min)

[![Mage quick start demo](media/mage-demo-quick-start-youtube-preview.png)](https://www.youtube.com/watch?v=cRib1zOaqWs "Mage quick start demo")

## More resources

Here is a [🗺️ step-by-step](docs/tutorials/quick-start.md) guide on how to use the tool.

1. [Jupyter notebook example](docs/tutorials/assets/quick-start.ipynb)
1. [Google Colaboratory (Colab) example](https://colab.research.google.com/drive/1Pc6dpAolwuSKuoOEpWSWgx6MbNraSMVE?usp=sharing)

Check out the [📚 tutorials](docs/tutorials/README.md) to quickly become a master of magic.

# 🔮 Features

1. [Data visualizations](#1-data-visualizations)
1. [Reports](#2-reports)
1. [Cleaning actions](#3-cleaning-actions)
1. [Data cleaning suggestions](#4-data-cleaning-suggestions)

### 1. Data visualizations
Inspect your data using different charts (e.g. time series, bar chart, box plot, etc.).

Here’s a list of available [charts](docs/charts/README.md).

<kbd>
  <img
    alt="dataset visualizations"
    src="media/dataset-overview-visualizations.png"
  />
</kbd>

### 2. Reports
Quickly diagnose data quality issues with summary reports.

Here’s a list of available [reports](docs/reports/README.md).

<kbd>
  <img
    alt="dataset reports"
    src="media/dataset-overview-reports.png"
  />
</kbd>

### 3. Cleaning actions
Easily add common cleaning functions to your pipeline with a few clicks.
Cleaning actions include imputing missing values, reformatting strings, removing duplicates,
and many more.

If a cleaning action you need doesn’t exist in the library,
you can write and save custom cleaning functions in the UI.

Here’s a list of available [cleaning actions](docs/actions/README.md).

<kbd>
  <img
    alt="cleaning actions"
    src="media/dataset-overview-actions-preview.png"
  />
</kbd>

### 4. Data cleaning suggestions
The tool will automatically suggest different ways to clean your data and improve quality metrics.

Here’s a list of available [suggestions](docs/suggestions/README.md).

<kbd>
  <img
    alt="suggested cleaning actions"
    src="media/dataset-overview.png"
  />
</kbd>

# 🗺️ Roadmap
Big features being worked on or in the design phase.

1. Encoding actions (e.g. one-hot encoding, label hasher, ordinal encoding, embeddings, etc.)
1. Data quality monitoring and alerting
1. Apply cleaning actions to columns and values that match a condition

Here’s a detailed list of [🪲 features and bugs](https://airtable.com/shrwN5wDuDuPScPut/tblAlH31g7dYRjmoZ)
that are in progress or upcoming.

# 🙋‍♀️ Contributing
We welcome all contributions to Mage;
from small UI enhancements to brand new cleaning actions.
We love seeing community members level up and give people power-ups!

Check out the [🎁 contributing guide](/docs/contributing/README.md) to get started
by setting up your development environment and
exploring the code base.

Got questions? Live chat with us in
[<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)

Anything you contribute, the Mage team and community will maintain. We’re in it together!

# 🧙 Community
We love the community of Magers (`/ˈmājər/`);
a group of mages who help each other realize their full potential!

To live chat with the Mage team and community,
please join the free Mage [<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)
channel.

For real-time news and fun memes, check out the Mage
[<img alt="Twitter" height="20" src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Twitter-logo.svg/2491px-Twitter-logo.svg.png" style="position: relative; top: 4px;" /> Twitter](https://twitter.com/mage_ai).

To report bugs or add your awesome code for others to enjoy,
visit [GitHub](https://github.com/mage-ai/mage-ai).

# 🪪 License
See the [LICENSE](LICENSE) file for licensing information.

<br />

[<img alt="Wind mage casting spell" height="160" src="media/mage-wind-casting-spell.svg" />](https://www.mage.ai/)
