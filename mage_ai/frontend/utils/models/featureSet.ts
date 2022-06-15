import TransformerActionType from '@interfaces/TransformerActionType';

export function getFeatureIdMapping(featureSet) {
  if (!featureSet) {
    return {};
  }

  return featureSet.insights?.[0]?.reduce((acc, currentFeature, idx) => {
    const { uuid } = currentFeature?.feature || {};
    acc[uuid] = idx;
    return acc;
  }, {});
}

export function getFeatureMapping(featureSet) {
  if (!featureSet) {
    return {};
  }

  return featureSet.insights?.[0]?.reduce((acc, currentFeature, idx) => {
    const featureData = currentFeature?.feature || {};
    acc[idx] = featureData;
    return acc;
  }, {});
}

export function getFeatureUUID(featureSet, featureIndex) {
  const featureMapping = getFeatureMapping(featureSet);
  const featureData = featureMapping[featureIndex];
  return featureData?.uuid;
}

export function getFeatureSetStatistics(featureSet, featureUUID) {
  if (!featureSet || !featureSet.statistics) {
    return {};
  }

  const { statistics } = featureSet;
  return {
    average: statistics[`${featureUUID}/average`],
    completeness: statistics[`${featureUUID}/completeness`],
    count: statistics[`${featureUUID}/count`],
    count_distinct: statistics[`${featureUUID}/count_distinct`],
    invalid_indices: statistics[`${featureUUID}/invalid_indices`],
    invalid_value_count: statistics[`${featureUUID}/invalid_value_count`],
    invalid_value_rate: statistics[`${featureUUID}/invalid_value_rate`],
    invalid_values: statistics[`${featureUUID}/invalid_values`],
    max: statistics[`${featureUUID}/max`],
    max_null_seq: statistics[`${featureUUID}/max_null_seq`],
    median: statistics[`${featureUUID}/median`],
    min: statistics[`${featureUUID}/min`],
    mode: statistics[`${featureUUID}/mode`],
    null_value_count: statistics[`${featureUUID}/null_value_count`],
    null_value_rate: statistics[`${featureUUID}/null_value_rate`],
    outlier_count: statistics[`${featureUUID}/outlier_count`],
    outlier_ratio: statistics[`${featureUUID}/outlier_ratio`],
    outliers: statistics[`${featureUUID}/outliers`],
    quality: statistics[`${featureUUID}/quality`],
    skew: statistics[`${featureUUID}/skew`],
    std: statistics[`${featureUUID}/std`],
    sum: statistics[`${featureUUID}/sum`],
    unique_value_rate: statistics[`${featureUUID}/unique_value_rate`],
    validity: statistics[`${featureUUID}/validity`],
    value_counts: statistics[`${featureUUID}/value_counts`],
  };
}

export function getFeatureSetInvalidValuesAll(featureSet, features) {
  if (!featureSet || !featureSet.statistics) {
    return {};
  }

  const { statistics } = featureSet;
  const invalidCells = {};
  features.forEach(featureUUID => {
    const invalid_indices = statistics[`${featureUUID}/invalid_indices`];
    invalidCells[featureUUID] = invalid_indices;
  });
  return invalidCells;
}

export function deserializeFeatureSet(featureSet: any) {
  const {
    pipeline = {},
  } = featureSet;
  const actions = Array.isArray(pipeline?.actions)
    ? pipeline.actions.map((action: TransformerActionType, idx: number) => ({
      ...action,
      id: idx + 1,
    }))
    : [];

  return {
    ...featureSet,
    pipeline: {
      ...pipeline,
      actions,
    },
  };
}
