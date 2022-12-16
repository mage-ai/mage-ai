import FeatureType from '@interfaces/FeatureType';
import ActionPayloadType from '@interfaces/ActionPayloadType';
import {
  ConditionType,
  OPERATOR_CONTAINS,
  OPERATOR_EQUAL,
  OPERATOR_GREATER_THAN,
  OPERATOR_GREATER_THAN_OR_EQUAL_TO,
  OPERATOR_LESS_THAN,
  OPERATOR_LESS_THAN_OR_EQUAL,
  OPERATOR_NOT_EQUAL,
} from './constants';

function buildOperatorPredicate(operator) {
  if (OPERATOR_CONTAINS === operator) {
    return (a, b) => b.includes(a);
  } else if (OPERATOR_EQUAL === operator) {
    return (a, b) => a === b;
  } else if (OPERATOR_GREATER_THAN === operator) {
    return (a, b) => a > b;
  } else if (OPERATOR_GREATER_THAN_OR_EQUAL_TO === operator) {
    return (a, b) => a >= b;
  } else if (OPERATOR_LESS_THAN === operator) {
    return (a, b) => a < b;
  } else if (OPERATOR_LESS_THAN_OR_EQUAL === operator) {
    return (a, b) => a <= b;
  } else if (OPERATOR_NOT_EQUAL === operator) {
    return (a, b) => a !== b;
  }

  return () => false;
}

export function evaluateCondition(
  condition: ConditionType,
  payload: ActionPayloadType,
  feature: FeatureType = null,
  opts: {
    multiColumns?: boolean;
  },
): boolean {
  const {
    feature_attribute: featureAttribute,
    operator,
    options_key: optionsKey,
    value,
  } = condition;
  const {
    multiColumns,
  } = opts ||  {};
  let a;

  if (optionsKey) {
    a = payload?.action_options?.[optionsKey];
  } else if (feature && featureAttribute) {
    a = feature?.[featureAttribute];
  } else if (!feature && featureAttribute && multiColumns)  {
    return true;
  }

  return buildOperatorPredicate(operator)(a, value);
}
