import { useMemo } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import InteractionType, {
  InteractionInputOptionType,
  InteractionInputStyleType,
  InteractionInputType,
  InteractionInputTypeEnum,
  InteractionLayoutItemType,
  InteractionVariableType,
} from '@interfaces/InteractionType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { PADDING_UNITS, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';

type InteractionDisplayProps = {
  interaction: InteractionType;
  setVariables?: (prev: any) => void;
  showVariableUUID?: boolean;
  variables?: {
    [key: string]: any;
  };
};

function InteractionDisplay({
  interaction,
  setVariables,
  showVariableUUID,
  variables: variablesProp,
}: InteractionDisplayProps) {
  const {
    inputs,
    layout,
    variables,
  } = interaction || {
    inputs: {},
    layout: [],
    variables: {},
  };

  const inputsMemo = useMemo(() => {
    const rows = [];

    layout?.forEach((layoutItems: InteractionLayoutItemType[], rowIndex: number) => {
      const row = [];

      layoutItems?.forEach(({
        variable: variableUUID,
        width,
      }: InteractionLayoutItemType, itemIndex: number) => {
        const {
          description,
          input: inputUUID,
          name,
          required,
        }: InteractionVariableType = variables?.[variableUUID] || {
          uuid: variableUUID,
        };
        const input: InteractionInputType = inputs?.[inputUUID];
        const {
          options,
          style,
          type: inputType,
        } = input || {
          options: [],
          style: null,
          type: null,
        };
        const key = `${variableUUID}-${inputType}`;
        const sharedProps = {
          required,
        };
        const inputEls = [];

        const variableValue = typeof variablesProp !== 'undefined'
          ? variablesProp?.[variableUUID]
          : undefined;

        if (InteractionInputTypeEnum.CHECKBOX === inputType) {
          inputEls.push(
            <FlexContainer
              alignItems="center"
              key={`${key}-${inputType}`}
            >
              {options?.map(({
                label,
                value,
              }: InteractionInputOptionType) => {
                const checkboxValues = variablesProp?.[variableUUID] || {};
                console.log(value, checkboxValues)
                // @ts-ignore
                const currentValue = checkboxValues?.[value] || checkboxValues?.[String(value)];

                return (
                  <Spacing key={String(value || label)} mr={PADDING_UNITS}>
                    <Checkbox
                      {...sharedProps}
                      label={label}
                      checked={!!currentValue}
                      onClick={() => setVariables?.(prev => ({
                        ...prev,
                        [variableUUID]: {
                          ...checkboxValues,
                          // @ts-ignore
                          [value]: !currentValue,
                        },
                      }))}
                    />
                  </Spacing>
                );
              })}
            </FlexContainer>
          );
        } else if (InteractionInputTypeEnum.TEXT_FIELD === inputType) {
          inputEls.push(
            <FlexContainer
              flexDirection="column"
              key={`${key}-${inputType}`}
            >
              {style?.multiline
                ? (
                  <TextArea
                    {...sharedProps}
                    key={`${key}-${inputType}`}
                    onChange={(e) => setVariables?.(prev => ({
                      ...prev,
                      [variableUUID]: e.target.value,
                    }))}
                    value={variableValue}
                  />
                )
                : (
                  <TextInput
                    {...sharedProps}
                    key={`${key}-${inputType}`}
                    onChange={(e) => setVariables?.(prev => ({
                      ...prev,
                      [variableUUID]: e.target.value,
                    }))}
                    type={style?.input_type || null}
                    value={variableValue}
                  />
                )
              }
            </FlexContainer>
          );
        } else if (InteractionInputTypeEnum.DROPDOWN_MENU === inputType) {
          inputEls.push(
            <Select
              {...sharedProps}
              key={`${key}-${inputType}`}
              onChange={(e) => setVariables?.(prev => ({
                ...prev,
                [variableUUID]: e.target.value,
              }))}
              value={variableValue}
            >
              <option value="" />
              {options?.map(({
                label,
                value,
              }: InteractionInputOptionType) => (
                <option key={String(value || label)} value={String(value || label)}>
                  {String(label || value)}
                </option>
              ))}
            </Select>
          );
        } else if (InteractionInputTypeEnum.SWITCH === inputType) {
          row.push(
            <Spacing key={key} mt={itemIndex >= 1 ? PADDING_UNITS : 0}>
              <FlexContainer alignItems="center" fullWidth>
                <ToggleSwitch
                  {...sharedProps}
                  checked={variableValue as boolean}
                  compact
                  key={`${key}-${inputType}`}
                  onCheck={(valFunc: (val: boolean) => boolean) => setVariables?.(prev => ({
                    ...prev,
                    [variableUUID]: valFunc(variableValue),
                  }))}
                />

                {(name || description) && <Spacing ml={PADDING_UNITS} />}

                {(name || description || showVariableUUID) && (
                  <FlexContainer
                    alignItems="flex-start"
                    flexDirection="row"
                    fullWidth
                    justifyContent="space-between"
                  >
                    {(name || description) && (
                      <Flex flex={1} flexDirection="column">
                        {name && (
                          <Text bold large success>
                            {name}
                          </Text>
                        )}

                        {description && description?.split('\n')?.map((line: string) => (
                          <Text default key={line}>
                            {line}
                          </Text>
                        ))}
                      </Flex>
                    )}

                    {showVariableUUID && (
                      <>
                        <Spacing mr={PADDING_UNITS} />

                        <Text monospace muted small>
                          {variableUUID}
                        </Text>
                      </>
                    )}
                  </FlexContainer>
                )}
              </FlexContainer>
            </Spacing>
          );
        }

        if (inputEls?.length >= 1) {
          row.push(
            <Spacing key={key} mt={itemIndex >= 1 ? PADDING_UNITS : 0}>
              {(name || description || showVariableUUID) && (
                <FlexContainer alignItems="flex-start" justifyContent="space-between">
                  <Flex flex={1} flexDirection="column">
                    <Spacing mb={1}>
                      {name && (
                        <Text bold large success>
                          {name}
                        </Text>
                      )}

                      {description && description?.split('\n')?.map((line: string) => (
                        <Text default key={line}>
                          {line}
                        </Text>
                      ))}
                    </Spacing>
                  </Flex>

                  <Spacing mr={PADDING_UNITS} />

                  {showVariableUUID && (
                    <Text monospace muted small>
                      {variableUUID}
                    </Text>
                  )}
                </FlexContainer>
              )}

              {inputEls}
            </Spacing>
          );
        }
      });

      rows.push(
        <Spacing
          key={`row-${rowIndex}`}
          mt={rowIndex >= 1 ? UNITS_BETWEEN_ITEMS_IN_SECTIONS : 0}
        >
          {row}
        </Spacing>
      );
    });

    return rows;
  }, [
    inputs,
    layout,
    setVariables,
    showVariableUUID,
    variables,
    variablesProp,
  ]);

  return (
    <>
      {inputsMemo}
    </>
  );
}

export default InteractionDisplay;
