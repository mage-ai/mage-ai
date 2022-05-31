![MageLogo](https://user-images.githubusercontent.com/99209078/171298628-d8f34d5b-9771-404d-947c-f446ce083215.png)
# Mage AI
Mage AI handles data cleaning using a single Python library.

## Table of Contents
1. [Introduction](#introduction)
1. [Installation](#installation)
1. [Getting Started](#getting-started)

## Introduction
Mage AI aims to simplify data pre-processing. With a few lines of code, you can:
- Generate data cleaning suggestions
- Display feature-specific statistics and visualizations
- Easily detect "holes" and anomalies in your data

Coming soon:
- Access faster data analysis and cleaning using Mage's public cloud server
- Perform no-code data transformations within the UI

## Installation

You can install the latest version from Github
```
pip install git+https://github.com/mage-ai/mage-ai.git
```

## Getting Started
```python
import mage_ai

df = pd.read_csv('/path_to_your_dataset')
feature_set = mage_ai.connect_data(df, name='test_data')
mage_ai.launch()
```

An example dashboard connected to purchasing data shows `Suggested actions` and `Reports`

Reports tell u if there are missing, duplicates, or anomalies in your data 

In addition to data transformations, `Visualizations` display correlations between your features, helping locate data leakage. Since Mage is open source, these charts and visualizations are customizable 😉

## Contribute
- slack channel
- Add issues 🪲
- 
