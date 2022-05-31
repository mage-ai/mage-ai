export function getFeatureIdMapping(featureSet) {
  return featureSet?.insights?.[0]?.reduce((acc, currentFeature, idx) => {
    const { uuid } = currentFeature?.feature || {};
    acc[uuid] = idx;
    return acc;
  }, {});
}
