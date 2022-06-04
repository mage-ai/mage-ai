import {
  CATEGORICAL_TYPES,
  DATE_TYPES,
  HUMAN_READABLE_MAPPING,
  METRICS_KEYS,
  METRICS_SORTED_MAPPING,
  NUMBER_TYPES,
  PERCENTAGE_KEYS,
  STAT_KEYS,
} from '../constants';

export function createMetricsSample(statistics) {
  const stats = Object.keys(statistics);
  const metricRows = Array(METRICS_KEYS.length).fill(0);

  stats.map((key) => {
    if (METRICS_KEYS.includes(key)) {
      let value = statistics[key].toPrecision(2);
      let bar = [false];
      const order = HUMAN_READABLE_MAPPING[key];
      const index = METRICS_SORTED_MAPPING[key];
      if (PERCENTAGE_KEYS.includes(key)) {
        value *= 100;
        bar = [true, value];
        value = `${value}%`;
      }
      metricRows[index] = {
        columnValues: [order, value, bar],
      };
    }
  });

  return {
    rowData: metricRows,
  };
}

export function createStatisticsSample(statistics, colTypes) {
  const stats = Object.keys(statistics);
  const types = Object.values(colTypes);
  const rowData = [];

  rowData.push({
    columnValues: ['Column count', types.length],
  });
  // Part one is the keys from metrics
  stats.map((key) => {
    if (STAT_KEYS.includes(key)) {
      const name = HUMAN_READABLE_MAPPING[key];
      rowData.push({
        columnValues: [name, statistics[key]],
      });
    }
  });

  // Part two is the count of data types
  let countCategory = 0;
  let countNumerical = 0;
  let countTimeseries = 0;

  types.map((val: string) => {
    if (CATEGORICAL_TYPES.includes(val)) {
      countCategory += 1;
    }
    else if (NUMBER_TYPES.includes(val)) {
      countNumerical += 1;
    } else if (DATE_TYPES.includes(val)) {
      countTimeseries += 1;
    }
  });

  rowData.push({
    columnValues: ['Categorical Features', countCategory],
  },{
    columnValues: ['Numerical Features', countNumerical],
  },{
    columnValues: ['Time series Features', countTimeseries],
  });

  return { rowData };
}
