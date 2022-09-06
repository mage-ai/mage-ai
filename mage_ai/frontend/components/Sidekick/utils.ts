import {
  HUMAN_READABLE_MAPPING,
  METRICS_KEYS,
  METRICS_RATE_KEY_MAPPING,
  METRICS_SORTED_MAPPING,
  METRICS_SUCCESS_DIRECTION_MAPPING,
  METRICS_WARNING_MAPPING,
  PERCENTAGE_KEYS,
  STAT_KEYS,
} from '@components/datasets/constants';
import { StatRow as StatRowType } from '@components/datasets/StatsTable';
import { getColumnTypeCounts } from '@components/datasets/overview/utils';
import { numberWithCommas } from '@utils/string';
import { transformNumber } from '@utils/number';

export function createMetricsSample({
  statistics,
}) {
  const stats = Object.keys(statistics);
  const metricRows = Array(METRICS_KEYS.length).fill(0);

  if (stats.length === 0) {
    return null;
  }

  stats.forEach((key) => {
    if (METRICS_KEYS.includes(key)) {
      const name = HUMAN_READABLE_MAPPING[key];
      let value = statistics[key];
      let rate = value;
      let progress = false;
      let columnFlexNumbers = [2, 3];
      const index = METRICS_SORTED_MAPPING[key];
      const successDirection = METRICS_SUCCESS_DIRECTION_MAPPING[key];
      const warning = METRICS_WARNING_MAPPING[key];

      if (PERCENTAGE_KEYS.includes(key)){
        progress = true;
        columnFlexNumbers = [2, 1, 2];
      } else if (key in METRICS_RATE_KEY_MAPPING) {
        value = transformNumber(value, 0);
        const rateKey = METRICS_RATE_KEY_MAPPING[key];
        rate = statistics[rateKey];
      }

      const qualityMetricObj: StatRowType = {
        columnFlexNumbers,
        name,
        progress,
        rate,
        successDirection,
        warning,
      };
      if (!PERCENTAGE_KEYS.includes(key)) {
        qualityMetricObj.value = value;
      }

      metricRows[index] = qualityMetricObj;
    }
  });

  return metricRows;
}

export function createStatisticsSample({
  columnTypes = {},
  statistics,
}) {
  const currentStats = Object.keys(statistics);
  if (currentStats.length === 0) {
    return null;
  }
  
  const currentTypes: string[] = Object.values(columnTypes);
  const currentTotal = currentTypes.length;
  const rowData: StatRowType[] = [];

  rowData.push({
    name: 'Column count',
    successDirection: METRICS_SUCCESS_DIRECTION_MAPPING.column_count,
    value: numberWithCommas(currentTotal),
  });

  currentStats.forEach((key) => {
    if (STAT_KEYS.includes(key)) {
      const name = HUMAN_READABLE_MAPPING[key];
      const currentValue = statistics[key];
      const warning = METRICS_WARNING_MAPPING[key];
      rowData.push({
        name,
        successDirection: METRICS_SUCCESS_DIRECTION_MAPPING[key],
        value: numberWithCommas(currentValue),
        warning,
      });
    }
  });

  const {
    countCategory: currentCountCategory,
    countDatetime: currentCountDatetime,
    countNumerical: currentCountNumerical,
  } = getColumnTypeCounts(currentTypes);

  rowData.push({
    name: 'Categorical Features',
    rate: currentCountCategory / currentTotal,
    value: numberWithCommas(currentCountCategory),
  }, {
    name: 'Numerical Features',
    rate: currentCountNumerical / currentTotal,
    value: numberWithCommas(currentCountNumerical),
  }, {
    name: 'Datetime Features',
    rate: currentCountDatetime / currentTotal,
    value: numberWithCommas(currentCountDatetime),
  });

  return rowData;
}

export function getFormattedVariable(variable) {
  return typeof variable === 'string' ? variable : JSON.stringify(variable);
}

export function getFormattedVariables(variables, filterBlock) {
  return variables
    ?.find(({ block }) => filterBlock(block))
    ?.variables
    ?.map(variable => {
      const variableValue = variable.value;
      return {
        ...variable,
        value: getFormattedVariable(variableValue),
      }
    })
}

export function parseVariables(variables) {
  if (!variables) {
    return variables;
  }
  
  return Object.entries(variables).reduce(
    (prev, [uuid, value]: [string, string]) => {
      let updatedValue = value;
      try {
        updatedValue = JSON.parse(value);
      } catch {
        // do nothing
      }

      return {
        ...prev,
        [uuid]: updatedValue,
      };
    },
    {},
  );
}
