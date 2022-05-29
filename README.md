# Mage AI

## Table of Contents
1. [Introduction](#introduction)
1. [Installation](#installation)
1. [Getting Started](#getting-started)

## Introduction
Mage AI is a Python library for data cleaning.

## Installation

You can install the latest version from Github
```
pip install git+https://github.com/mage-ai/mage-ai.git
```

## Getting Started
```python
import mage_ai
df = pd.read_csv('/path_to_your_dataset')
feature_set = mage_ai.connect_df(df, name='test_data')
mage_ai.launch()
```
