# How to add a chart

1. Add a new chart type
1. Define the configuration options for the chart
1. Define post processing logic for chart data
1. Create React component for rendering chart

## 1. Add a new chart type

Add a new type in [`mage_ai/data_preparation/models/widget/constants.py`](https://github.com/mage-ai/mage-ai/blob/master/mage_ai/data_preparation/models/widget/constants.py):

```python
class ChartType(str, Enum):
    # ...
    PIE_CHART = 'pie_chart'
```

Add a new type in [`mage_ai/frontend/interfaces/ChartBlockType.ts`](https://github.com/mage-ai/mage-ai/blob/master/mage_ai/frontend/interfaces/ChartBlockType.ts):

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

## 2. Define the configuration options for the chart

In the file `mage_ai/frontend/components/ChartBlock/constants.ts`,
add a list of options for the user to configure their chart with:

```javascript
export const CONFIGURATIONS_BY_CHART_TYPE = {
  [ChartTypeEnum.PIE_CHART]: [
    {
      label: () => 'variable name of values',
      monospace: true,
      uuid: 'super_cool_uuid',
    },
  ],
};
```

Also, add the new variable name to the following constant in the
file `mage_ai/frontend/interfaces/ChartBlockType.ts`,:

```javascript
export const VARIABLE_NAMES = [
  'super_cool_uuid',
];
```

If 1 or more of the configuration options is for a variable name that can be defined in the
chart block’s code and referenced at presentation time, then you must add the following
in the file `mage_ai/data_preparation/models/widget/constants.py`:

```python
VARIABLE_NAMES_BY_CHART_TYPE = {
    ChartType.PIE_CHART: [
        'super_cool_uuid',
    ],
}
```

### Add default settings to the configuration

When a user selects a chart type, you can set default values for these options.
In the file `mage_ai/frontend/interfaces/ChartBlockType.ts`, add the following:

```javascript
export const DEFAULT_SETTINGS_BY_CHART_TYPE = {
  [ChartTypeEnum.PIE_CHART]: {
    configuration: () => ({
      [VARIABLE_NAME_X]: 'x',
    }),
    content: ({
      upstream_blocks: upstreamBlocks = [],
    }: BlockType) => {
      const uuid = upstreamBlocks[0];

      return `x = ${uuid}[${uuid}.columns[0]]`;
    },
  },
};
```

### Add helpful information about the variable type that the chart expects

Each chart requires 1 or more input values.
The chart knows how to access those input values by referencing a variable name that the user
inputs into the configuration options.

Each variable can be of a certain type; array/list of strings, integers, etc.

To help the user know how to set the variables properly,
add the following information into the file `mage_ai/frontend/components/ChartBlock/constants.ts`:

```javascript
export const VARIABLE_INFO_BY_CHART_TYPE = {
  [ChartTypeEnum.PIE_CHART]: {
    [VARIABLE_NAME_X]: (): string => 'must be a list of booleans, dates, integers, floats, or strings.',
  },
};
```

## 3. Define post processing logic for chart data

In the file `mage_ai/data_preparation/models/widget/__init__.py`,
add additional logic for parsing the input values from the
variables defined in the chart block’s code.

The output of this method is provided to the front-end React components for rendering.

```python
class Widget(Block):
    def post_process_variables(self, variables):
        if ChartType.PIE_CHART == self.chart_type:
            variables = {}

        return variables
```

## 4. Create React component for rendering chart

In the file `mage_ai/frontend/components/ChartBlock/ChartController.tsx`,
import your React component for your new chart and render it.

For example:

```javascript
function ChartController({
  block,
  data,
  width,
}: ChartControllerProps) {
  const {
    configuration,
  } = block;
  const chartType = configuration?.chart_type;

  if (ChartTypeEnum.PIE_CHART === chartType) {
    return <PieChart />;
  }
}
```
