import React, { useContext } from 'react';
import dynamic from 'next/dynamic';
import { ThemeContext } from 'styled-components';
import '@uiw/react-textarea-code-editor/dist.css';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FeatureType from '@interfaces/FeatureType';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ActionPayloadType, { ActionVariableTypeEnum } from '@interfaces/ActionPayloadType';
import actions from './actions';
import light from '@oracle/styles/themes/light';
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
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';
import { evaluateCondition } from './utils';
import {
  indexBy,
  removeAtIndex,
} from '@utils/array';

type ActionFormProps = {
  actionType: string;
  axis: string;
  currentFeature?: FeatureType;
  features?: FeatureType[];
  onSave: () => void;
  payload: ActionPayloadType;
  setPayload: (payload: ActionPayloadType) => void;
};

const CodeEditor = dynamic(
  () => import('@uiw/react-textarea-code-editor').then((mod) => mod.default),
  {
    ssr: false,
  },
);

function ActionForm({
  actionType,
  axis,
  features = [],
  currentFeature,
  onSave,
  payload,
  setPayload,
}: ActionFormProps) {
  const themeContext = useContext(ThemeContext);

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

  const updateActionCode = (newCode) => {
    const av = actionVariables ? { ...actionVariables } : {};

    updatePayload({
      action_code: newCode,
      action_variables: av,
    });
  }

  const config: FormConfigType =
    (axis === 'row' ? actions.rows : actions.columns)?.[actionType];

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

  const featuresByUUID = indexBy(features, ({ uuid }) => uuid);

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
        {code && (
          <Spacing mb={3}>
            {code.values === VALUES_TYPE_USER_INPUT && (
              <CodeEditor
                // @ts-ignore
                language="python"
                minHeight={code.multiline ? UNIT * 12 : null}
                onChange={e => updateActionCode(e.target.value)}
                padding={UNIT * 2}
                style={{
                  backgroundColor: themeContext.monotone.grey100,
                  fontFamily: MONO_FONT_FAMILY_REGULAR,
                  fontSize: REGULAR_FONT_SIZE,
                  tabSize: 4,
                }}
                value={actionCode}
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
                {features.map(({
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
                                column_type: featuresByUUID[uuid]?.columnType,
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
