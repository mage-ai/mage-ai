import TransformerActionType from '@interfaces/TransformerActionType';
import { StatisticsType } from '@interfaces/BlockType';

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

export function getOverallStatistics(featureSet) {
  if (!featureSet || !featureSet.statistics) {
    return {} as StatisticsType;
  }

  const { statistics } = featureSet;
  return {
    'completeness': statistics['completeness'],
    'count': statistics['count'],
    'duplicate_row_count': statistics['duplicate_row_count'],
    'duplicate_row_rate': statistics['duplicate_row_rate'],
    'empty_column_count': statistics['empty_column_count'],
    'empty_column_rate': statistics['empty_column_rate'],
    'empty_row_count': statistics['empty_row_count'],
    'total_invalid_value_count': statistics['total_invalid_value_count'],
    'total_invalid_value_rate': statistics['total_invalid_value_rate'],
    'total_null_value_count': statistics['total_null_value_count'],
    'total_null_value_rate': statistics['total_null_value_rate'],
    'validity': statistics['validity'],
  };
}

export function getFeatureStatistics(statistics, featureUUID) {
  return {
    average: statistics[`${featureUUID}/average`],
    avg_string_length: statistics[`${featureUUID}/avg_string_length`],
    avg_word_count: statistics[`${featureUUID}/avg_word_count`],
    completeness: statistics[`${featureUUID}/completeness`],
    count: statistics[`${featureUUID}/count`],
    count_distinct: statistics[`${featureUUID}/count_distinct`],
    invalid_indices: statistics[`${featureUUID}/invalid_indices`],
    invalid_value_count: statistics[`${featureUUID}/invalid_value_count`],
    invalid_value_rate: statistics[`${featureUUID}/invalid_value_rate`],
    invalid_values: statistics[`${featureUUID}/invalid_values`],
    max: statistics[`${featureUUID}/max`],
    max_character_count: statistics[`${featureUUID}/max_character_count`],
    max_null_seq: statistics[`${featureUUID}/max_null_seq`],
    max_word_count: statistics[`${featureUUID}/max_word_count`],
    median: statistics[`${featureUUID}/median`],
    min: statistics[`${featureUUID}/min`],
    min_character_count: statistics[`${featureUUID}/min_character_count`],
    min_word_count: statistics[`${featureUUID}/min_word_count`],
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

export function getFeatureSetStatistics(featureSet, featureUUID) {
  if (!featureSet || !featureSet.statistics) {
    return {} as StatisticsType;
  }

  return getFeatureStatistics(featureSet.statistics, featureUUID);
}

export function getFeatureSetInvalidValuesAll(featureSet, features) {
  if (!featureSet || !featureSet.statistics) {
    return {};
  }

  const { statistics } = featureSet;
  const invalidCells = {};
  features?.forEach(featureUUID => {
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
