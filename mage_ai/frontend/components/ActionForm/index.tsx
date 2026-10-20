import React, { useContext, useState } from 'react';
import { ThemeContext } from 'styled-components';

import ActionPayloadType, {
  ActionPayloadOverrideType,
  ActionTypeEnum,
  ActionVariableTypeEnum,
  AxisEnum,
} from '@interfaces/ActionPayloadType';
import Button from '@oracle/elements/Button';
import CodeEditor from '@components/CodeEditor';
import Divider from '@oracle/elements/Divider';
import FeatureType, { FeatureResponseType } from '@interfaces/FeatureType';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import actions from './actions';
import { Check, Close } from '@oracle/icons';
import {
  ContainerStyle,
  OptionStyle,
} from './index.style';
import {
  FormConfigType,
  VALUES_TYPE_COLUMNS,
  VALUES_TYPE_USER_INPUT,
} from './constants';
import { evaluateCondition } from './utils';
import { getCustomCodeState, setCustomCodeState } from '@storage/localStorage';
import { removeAtIndex } from '@utils/array';

type ActionFormProps = {
  actionType: ActionTypeEnum;
  axis: string;
  currentFeature?: FeatureType;
  featureSetId?: string;
  features?: FeatureResponseType[];
  noBorder?: boolean;
  noHeader?: boolean;
  onClose?: () => void;
  onSave: (actionPayloadOverride?: ActionPayloadOverrideType) => void;
  payload: ActionPayloadType;
  setPayload: (payload: ActionPayloadType) => void;
  shadow?: boolean;
};

function ActionForm({
  actionType,
  axis,
  features = [],
  currentFeature,
  featureSetId,
  noBorder,
  noHeader,
  onClose,
  onSave,
  payload,
  setPayload,
  shadow,
}: ActionFormProps) {
  const [actionCodeState, setActionCodeState] = useState(payload?.action_code);

  const {
    action_arguments: actionArguments,
    action_code: actionCode,
    action_options: actionOptions,
    action_variables: actionVariables,
  } = payload;

  const updatePayload = data => setPayload({
    ...payload,
    ...data,
  });

  const saveActionForm = () => {
    const av = actionVariables ? { ...actionVariables } : {};
    const actionPayloadOverride: ActionPayloadOverrideType = {
      action_variables: av,
    };

    if (actionCodeState) {
      actionPayloadOverride.action_code = actionCodeState;
    }

    return onSave(actionPayloadOverride);
  };

  const config: FormConfigType =
    (axis === AxisEnum.ROW ? actions.rows : actions.columns)?.[actionType];

  const {
    arguments: configArguments,
    code,
    description,
    multiColumns,
    options,
    title,
  } = config || {};

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
    condition: argumentsCondition,
    description: argumentsDescription,
    values: argumentsValues,
  } = configArguments || {};

  const showColumns = !currentFeature && multiColumns;

  return (
    <ContainerStyle
      noBorder={noBorder}
      shadow={shadow}
    >
      {!noHeader &&
        <>
          <FlexContainer justifyContent="space-between">
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

            <Spacing p={2}>
              <Button
                basic
                iconOnly
                onClick={onClose}
                padding="0px"
                transparent
              >
                <Close muted />
              </Button>
            </Spacing>
          </FlexContainer>
          <Divider />
        </>
      }

      <Spacing p={!noHeader && 2} pt={noHeader && 2}>
        {code && (
          <Spacing mb={3}>
            {code.values === VALUES_TYPE_USER_INPUT && (
              <CodeEditor
                language="python"
                onChange={e => {
                  payload['action_code'] = e;
                  setActionCodeState(payload.action_code ?? actionCode);
                  setCustomCodeState({
                    actionType,
                    featureSetId,
                    newValue: e,
                  });
                }}
                value={actionCode
                  ?? (getCustomCodeState({ actionType, featureSetId }) ?? code.default)
                }
              />
            )}
          </Spacing>
        )}

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
                {features?.map(({
                  column_type,
                  uuid,
                }) => {
                  const alreadyInArguments = actionArguments?.includes(uuid);

                  return (
                    <Spacing
                      key={uuid}
                      mr={1}
                      mt={1}
                    >
                      <Link
                        block
                        noHoverUnderline
                        noOutline
                        onClick={() => {
                          const av = { ...actionVariables };
                          if (alreadyInArguments) {
                            delete av[uuid];
                          } else {
                            av[uuid] = {
                              [ActionVariableTypeEnum.FEATURE]: {
                                column_type,
                                uuid,
                              },
                              type: ActionVariableTypeEnum.FEATURE,
                            };
                          }

                          updatePayload({
                            action_arguments: [
                              ...(alreadyInArguments
                                ? removeAtIndex(actionArguments || [], actionArguments?.indexOf(uuid))
                                : [...(actionArguments || []), uuid]),
                            ],
                            action_variables: av,
                          });
                        }}
                        preventDefault
                      >
                        <OptionStyle selected={alreadyInArguments}>
                          <FlexContainer alignItems="center">
                            <Text>
                              {uuid}
                            </Text>

                            <Spacing mr={1} />

                            {alreadyInArguments && <Check earth />}
                          </FlexContainer>
                        </OptionStyle>
                      </Link>
                    </Spacing>
                  );
                })}
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
            conditionMet = evaluateCondition(condition, payload, currentFeature, {
              multiColumns,
            });
          }

          if (Array.isArray(values)) {
            opts.push(...values);
          } else if (VALUES_TYPE_COLUMNS === values) {

          } else if (VALUES_TYPE_USER_INPUT === values) {
            valuesEl = (
              <TextInput
                // @ts-ignore
                compact
                fullWidth
                onChange={e => updatePayload({
                  action_options: {
                    ...actionOptions,
                    [optionKey]: e.target.value,
                  },
                })}
                value={optionValue}
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
                  }) => {
                    let conditionMet = true;

                    if (condition) {
                      conditionMet = evaluateCondition(condition, payload, currentFeature, {
                        multiColumns,
                      });
                    }

                    return conditionMet && (
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

                                {description && (
                                  <>
                                    <br />

                                    <Text inline muted xsmall>
                                      {description}
                                    </Text>
                                  </>
                                )}
                              </Text>

                              <Spacing mr={1} />

                              {optionValue === value && <Check earth />}
                            </FlexContainer>
                          </OptionStyle>
                        </Link>
                      </Spacing>
                    );
                  })}
                </FlexContainer>
              )}

              {valuesEl}
            </Spacing>
          );
        })}

        <Spacing mt={(configArguments || showColumns || options) ? 3 : 0}>
          <Button onClick={saveActionForm}>
            Apply
          </Button>
        </Spacing>
      </Spacing>
    </ContainerStyle>
  );
}

export default ActionForm;
