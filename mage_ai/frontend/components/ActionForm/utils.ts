import FeatureType from '@interfaces/FeatureType';
import TransformerActionType from '@interfaces/TransformerActionType';
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
    return (a, b) => a.includes(b);
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
  payload: TransformerActionType,
  feature: FeatureType = null,
): boolean {
  const {
    feature_attribute: featureAttribute,
    operator,
    options_key: optionsKey,
    value,
  } = condition;
  let a;

  if (optionsKey) {
    a = payload?.action_options?.[optionsKey];
  } else if (feature && featureAttribute) {
    a = feature?.[featureAttribute]
  }

  return buildOperatorPredicate(operator)(a, value);
}
