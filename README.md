![Mage Purple](https://user-images.githubusercontent.com/99209078/171309703-6bbd25c4-9afb-437e-9c5b-363be5ea09b2.png)
# Mage AI
Mage AI cleans your data using a single Python library.

## Table of Contents
1. [Introduction](#introduction)
1. [Installation](#installation)
1. [Getting Started](#getting-started)
2. [Usage](#usage)
3. [To Contribute](#to-contribute)

## Introduction
Mage AI aims to simplify data pre-processing. With a few lines of code, you can:
- Create a data cleaning pipeline and clean your data with a few clicks.
- Automatically generate cleaning suggestions in your local notebook
- Display feature-specific statistics and visualizations
- Easily detect "holes" and anomalies in your data

Coming soon:
- Export data cleaning pipeline and integrate into your production data pipelines.
- Access faster data analysis and cleaning using Mage's public cloud server.
- Support user defined cleaning functions within the UI.
- Perform no-code data transformations within the UI.

## Installation

You can install the latest version from Github
```
pip install git+https://github.com/mage-ai/mage-ai.git
```

## Getting Started
Within your [Jupyter Notebook](https://jupyter.org/install) or [Google Colaboratory](https://colab.research.google.com/), the following 4 lines of code connects Mage with your data to generate data cleaning suggestions and data insights.
```python
import mage_ai

df = pd.read_csv('/path_to_your_dataset')
feature_set = mage_ai.connect_data(df, name='test_data')
mage_ai.launch()
```

## Usage
An example dashboard connected to purchasing data shows `Suggested actions` and `Reports`.

![image](https://user-images.githubusercontent.com/99209078/171302101-1c0de1a6-6c40-46cc-9563-73734e7fe2f5.png)

In `Suggested actions`, you can edit and apply suggested data cleaning actions. `Reports` provides feature-specific reports statistics that make it obvious if there are missing, duplicates, or anomalies in your data.

In addition, the dashboard displays column-specific summaries, further suggestions, and `Visualizations`. These help you identify correlations between your features, which sometimes leads to data leakage. Since Mage is open source, these charts and visualizations are customizable. 😉

<img width="752" alt="Screen Shot 2022-05-31 at 3 14 52 PM" src="https://user-images.githubusercontent.com/99209078/171302044-fedd4633-3a8c-42ac-87d4-f18dd48994d9.png">

## To Contribute
We would be overjoyed by your help! Ways to contribute to our community ✨:
- Adding issues 🪲 and helping us verify the 🔧 fixes we push.
- Review source code changes.
- Engage with other Mage users in our [Slack channel](https://mage.ai/chat)
- And share [user feedback and experiences](https://mage.ai/chat)!
