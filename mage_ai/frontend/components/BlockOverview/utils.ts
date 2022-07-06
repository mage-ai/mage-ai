import FeatureType from '@interfaces/FeatureType';
import { roundNumber } from '@utils/string';
import { sortByKey } from '@utils/array';

export const buildHeatmapData = (correlations) => {
  const xyLabels = [];
  const heatmapData = correlations?.map(({
    correlations: c,
    feature: { uuid },
  }, idx: number) => {
    xyLabels.push({
      label: uuid,
    });
  
    const arr = c[0].y.map(({ value }) => roundNumber(value));
    arr.splice(idx, 0, 1);

    return arr;
  });

  return {
    heatmapData,
    xyLabels,
  };
};

export const buildNullValueData = (features: FeatureType[], statistics) => (
  sortByKey(
    features?.map(feature => ({
      feature,
      value: 1 - statistics[`${feature.uuid}/null_value_rate`],
    })),
    'value',
  )
);

export const buildUniqueValueData = (features: FeatureType[], statistics) => (
  sortByKey(
    features?.map(feature => ({
      feature,
      value: statistics[`${feature.uuid}/count_distinct`],
    })),
    'value',
  )
);

export const buildValueDistributionData = (features: FeatureType[], statistics) => (
  sortByKey(
    features?.map(feature => {
      const [value, frequency] = Object.entries(statistics[`${feature.uuid}/value_counts`])[0];
      const percentage = Number(frequency) / statistics.count;
      return {
        feature,
        percentage,
        value,
      };
    }),
    'percentage',
  )
);
