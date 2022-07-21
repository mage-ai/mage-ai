# How to add a chart

1. Add a new chart type

## 1. Add a new chart type

Add a new type in [`mage_ai/data_preparation/models/widget/constants.py`](https://github.com/mage-ai/mage-ai/blob/master/mage_ai/data_preparation/models/widget/constants.py):

```python
class ChartType(str, Enum):
    # ...
    PIE_CHART = 'pie_chart'
```

Add a new type in [`mage_ai/frontend/interfaces/BlockType.ts`](https://github.com/mage-ai/mage-ai/blob/master/mage_ai/frontend/interfaces/BlockType.ts):

```javascript
export enum ChartTypeEnum {
  // ...
  PIE_CHART = 'pie_chart',
}

export const CHART_TYPES = [
  // ...
  ChartTypeEnum.PIE_CHART,
];
```
