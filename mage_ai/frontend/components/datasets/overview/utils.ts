import { getPercentage } from '@utils/number';
import {
  CATEGORICAL_TYPES,
  DATE_TYPES,
  HUMAN_READABLE_MAPPING,
  METRICS_KEYS,
  METRICS_SORTED_MAPPING,
  NUMBER_TYPES,
  PERCENTAGE_KEYS,
  STAT_KEYS,
  WARN_KEYS,
} from '../constants';

export function createMetricsSample(statistics) {
  const stats = Object.keys(statistics);
  const metricRows = Array(METRICS_KEYS.length).fill(0);

  stats.map((key) => {
    if (METRICS_KEYS.includes(key)) {
      let bar: any[] = [false];
      let value = statistics[key];
      const order = HUMAN_READABLE_MAPPING[key];
      const index = METRICS_SORTED_MAPPING[key];
      if (PERCENTAGE_KEYS.includes(key)) {
        bar = [true, value * 100];
        value = getPercentage(value);
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

  // First count to get totals
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

  const total = countCategory + countNumerical + countTimeseries;

  // First push is the keys from metrics to sort it.
  stats.map((key) => {
    if (STAT_KEYS.includes(key)) {
      const name = HUMAN_READABLE_MAPPING[key];
      let value = statistics[key];
      if (WARN_KEYS.includes(key)) {
        value = `${value} (${getPercentage(value / total)})`;
      }
      rowData.push({
        columnValues: [name, value],
      });
    }
  });

  rowData.push({
    columnValues: ['Categorical Features', `${countCategory} (${getPercentage(countCategory / total)})`],
  },{
    columnValues: ['Numerical Features', `${countNumerical} (${getPercentage(countNumerical / total)})`],
  },{
    columnValues: ['Time series Features', `${countTimeseries} (${getPercentage(countTimeseries / total)})`],
  });

  return { rowData };
}
