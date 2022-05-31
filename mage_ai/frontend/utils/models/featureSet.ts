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
    const { uuid } = currentFeature?.feature || {};
    acc[idx] = uuid;
    return acc;
  }, {});
}
