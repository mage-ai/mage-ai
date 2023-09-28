import moment from 'moment';

import FeatureType, {
  ColumnTypeEnum,
} from '@interfaces/FeatureType';
import {
  LabelTypeEnum,
} from '@interfaces/InsightsType';
import { roundNumber } from '@utils/string';
import { sortByKey, standardDeviation, sum } from '@utils/array';

export function buildCorrelationsRowData(correlations, correlationThreshold = null) {
  const correlatedColumnsSeen = {};
  const correlationsRowData = [];

  correlations?.forEach(({
    correlations: correlations2,
    feature,
  }) => {
    const { uuid } = feature;
    if (!correlatedColumnsSeen[uuid]) {
      correlations2?.forEach(({
        x = [],
        y = [],
      }) => {
        const arr = x
          .map(({ label }, idx) => [label, y[idx].value])
          .filter(([, value]) => correlationThreshold === null
            || Math.abs(Number(value)) >= correlationThreshold,
          );

        arr.forEach(([label, value]) => {
          if (!correlatedColumnsSeen[label]) {
            correlationsRowData.push([
              uuid,
              label,
              value,
            ]);
          }

          correlatedColumnsSeen[label] = true;
        });
      });
    }

    correlatedColumnsSeen[uuid] = true;
  });

  return correlationsRowData;
}

export function buildDistributionData(
  chartData,
  featuresByUUID,
  opts: {
    calculateAnomaly?: any;
    feature?: FeatureType;
    getYValue?: any;
  } = {}
) {
  const {
    calculateAnomaly,
    feature: featureProp,
    getYValue,
  } = opts || {};
  const {
    x,
    x_metadata: {
      label: featureUUID,
      label_type: labelType,
    },
    y,
  } = chartData;

  const yValues = y?.map((yInstance) => getYValue?.(yInstance)) || [];
  const yValuesMax = Math.max(...yValues);
  const yValuesMin = Math.max(...yValues);
  const yValuesSum = sum(yValues);
  const yValuesStandardDeviation = standardDeviation(yValues);
  const yValuesAverage = yValuesSum / Math.max(1, yValues.length);

  const feature = featuresByUUID[featureUUID] || featureProp;
  const columnType = feature?.columnType;
  const isDatetime = ColumnTypeEnum.DATETIME === columnType;
  const unusualRange = [];
  const unusualValues = [];
  let interval;

  const numberOfBuckets = x.length;

  const data = x.map((xCurrent, idx) => {
    const {
      label,
      max,
      min,
    } = xCurrent;
    let xLabel;
    let xLabelMin;
    let xLabelMax;
    let hideRange;
    const yCurrent = y[idx];

    if (LabelTypeEnum.RANGE === labelType) {
      if (!interval) {
        interval = max - min;
      }

      hideRange = ColumnTypeEnum.NUMBER === columnType && interval <= numberOfBuckets;
      if (hideRange) {
        xLabel = Number(min);
      } else {
        xLabel = (interval / 2) + min;

        if (isDatetime) {
          let formatTick = 'M/D/YYYY';
          let formatRangeMin = 'M/D/YYYY';
          let formatRangeMax = 'M/D/YYYY';

          if (interval <= 1) {
            // second interval
            formatTick = interval <= 0.1 ? 'H:mm:ss.SSS' : 'H:mm:ss';
            formatRangeMin = 'H:mm:ss.SSS';
            formatRangeMax = 'H:mm:ss.SSS';
          } else if (interval <= 60) {
            // minute interval
            formatTick = 'H:mm';
            formatRangeMin = 'H:mm:ss';
            formatRangeMax = 'H:mm:ss';
          } else if (interval <= 60 * 60) {
            // hour interval
            formatTick = 'H:mm';
            formatRangeMin = 'M/D/YYYY H:mm';
            formatRangeMax = 'H:mm';
          } else if (interval <= 60 * 60 * 24) {
            // day with hour interval
            formatRangeMin = 'M/D/YYYY H:mm';
            formatRangeMax = 'M/D/YYYY H:mm';
          }

          xLabel = moment.unix(xLabel).format(formatTick);
          xLabelMin = moment.unix(min).format(formatRangeMin);
          xLabelMax = moment.unix(max).format(formatRangeMax);
        } else {
          xLabel = roundNumber(xLabel);
        }
      }
    } else {
      xLabel = label;
    }

    const yPrevious = idx >= 1 ? y[idx - 1] : null;
    let isUnusual = false;

    if (calculateAnomaly) {
      isUnusual = calculateAnomaly({
        x: xCurrent,
        y: yCurrent,
        yPrevious,
        yValues,
        yValuesAverage,
        yValuesMax,
        yValuesMin,
        yValuesStandardDeviation,
        yValuesSum,
      });
    }

    const obj = {
      hideRange,
      isUnusual,
      x: xCurrent,
      xLabel,
      xLabelMax,
      xLabelMin,
      y: yCurrent,
    };

    if (isUnusual) {
      if (hideRange) {
        unusualValues.push(obj);
      } else {
        unusualRange.push(obj);
      }
    }

    return obj;
  });

  return {
    distribution: {
      data,
      featureUUID,
    },
    rangedWithUnusualDistribution: sortByKey(
      unusualRange,
      ({ y }) => getYValue(y),
      {
        ascending: false,
      },
    ),
    unusualDistribution: sortByKey(
      unusualValues,
      ({ y }) => getYValue(y),
      {
        ascending: false,
      },
    ),
  };
}

export function hasHighDistribution(
  countOfSingleValue,
  totalNumberOfValues,
  uniqueValues,
) {
  const distributionPercentage = countOfSingleValue / totalNumberOfValues;
  const uniquePercentage = uniqueValues / totalNumberOfValues;

  return distributionPercentage >= ((1 / uniqueValues) * 1.5)
    && distributionPercentage >= uniquePercentage;
}
