import React from 'react';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FeatureType from '@interfaces/FeatureType';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ActionPayloadType from '@interfaces/ActionPayloadType';
import actions from './actions';
import { Check } from '@oracle/icons';
import {
  ContainerStyle,
  OptionStyle,
} from './index.style';
import {
  FormConfigType,
  VALUES_TYPE_COLUMNS,
  VALUES_TYPE_USER_INPUT,
} from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { evaluateCondition } from './utils';
import { removeAtIndex } from '@utils/array';

type ActionFormProps = {
  actionType: string;
  axis: string;
  currentFeature?: FeatureType;
  features?: FeatureType[];
  onSave: () => void;
  payload: ActionPayloadType;
  setPayload: (payload: ActionPayloadType) => void;
};

function ActionForm({
  actionType,
  axis,
  features,
  currentFeature,
  onSave,
  payload,
  setPayload,
}: ActionFormProps) {
  const {
    action_arguments: actionArguments,
    action_options: actionOptions,
  } = payload;

  const updatePayload = data => setPayload({
    ...payload,
    ...data,
  });

  const config: FormConfigType =
    (axis === 'row' ? actions.rows : actions.columns)?.[actionType];

  if (!config) {
    return (
      <Spacing my={1}>
        <Text>
          There’s no configuration for axis <Text bold inline monospace>
            {axis}
          </Text> and action type <Text bold inline monospace>
            {actionType}
          </Text>.
          <br />
          Please add it in <Text bold inline monospace>
            /mage_ai/frontend/components/ActionForm/actions.ts
          </Text>.
        </Text>
      </Spacing>
    );
  }

  const {
    arguments: configArguments,
    description,
    multiColumns,
    options,
    title,
  } = config;

  const {
    condition: argumentsCondition,
    description: argumentsDescription,
    values: argumentsValues,
  } = configArguments || {};

  const showColumns = !currentFeature && multiColumns;

  return (
    <ContainerStyle>
      <Spacing p={2}>
        <Text>
          {title}
        </Text>

        {description && (
          <Text muted small>
            {description}
          </Text>
        )}
      </Spacing>

      <Divider />

      <Spacing p={2}>
        {(configArguments || showColumns) && (
          <Spacing mb={3}>
            <Text monospace>
              {showColumns ? 'columns' : 'arguments'}
            </Text>

            {argumentsDescription && (
              <Text muted small>
                {argumentsDescription}
              </Text>
            )}

            {(VALUES_TYPE_COLUMNS === argumentsValues || showColumns) && (
              <FlexContainer flexWrap="wrap">
                {features.map(({
                  uuid,
                }) => (
                  <Spacing
                    key={uuid}
                    mr={1}
                    mt={1}
                  >
                    <Link
                      block
                      noHoverUnderline
                      noOutline
                      onClick={() => updatePayload({
                        action_arguments: [
                          ...(actionArguments?.includes(uuid)
                            ? removeAtIndex(actionArguments || [], actionArguments?.indexOf(uuid))
                            : [...(actionArguments || []), uuid]),
                        ],
                      })}
                      preventDefault
                    >
                      <OptionStyle selected={actionArguments?.includes(uuid)}>
                        <FlexContainer alignItems="center">
                          <Text>
                            {uuid}
                          </Text>

                          <Spacing mr={1} />

                          {actionArguments?.includes(uuid) && <Check earth />}
                        </FlexContainer>
                      </OptionStyle>
                    </Link>
                  </Spacing>
                ))}
              </FlexContainer>
            )}
          </Spacing>
        )}

        {options && Object.entries(options).map(([optionKey, config], idx: number) => {
          const {
            condition,
            description,
            values,
          } = config;
          const optionValue = actionOptions?.[optionKey];
          const opts = [];

          let conditionMet = true;
          let valuesEl;

          if (condition) {
            conditionMet = evaluateCondition(condition, payload, currentFeature);
          }

          if (Array.isArray(values)) {
            opts.push(...values);
          } else if (VALUES_TYPE_COLUMNS === values) {

          } else if (VALUES_TYPE_USER_INPUT === values) {
            valuesEl = (
              <TextInput
                // @ts-ignore
                compact
                onChange={e => updatePayload({
                  action_options: {
                    ...actionOptions,
                    [optionKey]: e.target.value,
                  },
                })}
                value={optionValue}
                width={UNIT * 40}
              />
            );
          }

          return conditionMet && (
            <Spacing key={optionKey} mt={idx >= 1 ? 2 : 0}>
              <Text monospace>
                {optionKey}
              </Text>
              {description && (
                <Text muted small>
                  {description}
                </Text>
              )}

              {opts && (
                <FlexContainer flexWrap="wrap">
                  {opts.map(({
                    condition,
                    description,
                    value,
                  }) => (
                    <Spacing
                      key={value}
                      mr={1}
                      mt={1}
                      // @ts-ignore
                      title={description}
                    >
                      <Link
                        block
                        noHoverUnderline
                        noOutline
                        onClick={() => updatePayload({
                          action_options: {
                            ...actionOptions,
                            [optionKey]: optionValue === value ? null : value,
                          },
                        })}
                        preventDefault
                      >
                        <OptionStyle selected={optionValue === value}>
                          <FlexContainer alignItems="center">
                            <Text>
                              {value}
                            </Text>

                            <Spacing mr={1} />

                            {optionValue === value && <Check earth />}
                          </FlexContainer>
                        </OptionStyle>
                      </Link>
                    </Spacing>
                  ))}
                </FlexContainer>
              )}

              {valuesEl}
            </Spacing>
          );
        })}

        <Spacing mt={(configArguments || showColumns || options) ? 3 : 0}>
          <Button onClick={onSave}>
            Apply
          </Button>
        </Spacing>
      </Spacing>
    </ContainerStyle>
  );
}

export default ActionForm;
