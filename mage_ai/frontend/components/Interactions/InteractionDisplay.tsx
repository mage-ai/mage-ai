import { useMemo } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
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
};

function InteractionDisplay({
  interaction,
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

        if (InteractionInputTypeEnum.CHECKBOX === inputType) {
          inputEls.push(
            <FlexContainer
              alignItems="center"
              key={`${key}-${inputType}`}
            >
              {options?.map(({
                label,
                value,
              }: InteractionInputOptionType) => (
                <Spacing key={String(value || label)} mr={PADDING_UNITS}>
                  <Checkbox
                    {...sharedProps}
                    label={label}
                    // checked={!!value}
                    // onClick={(e) => {
                    //   console.log(value, e.target.value);
                    // }}
                  />
                </Spacing>
              ))}
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
                  />
                )
                : (
                  <TextInput
                    {...sharedProps}
                    key={`${key}-${inputType}`}
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
              // onChange={(e) => {
              //   pauseEvent(e);
              //   setAttributesMapping(prev => ({
              //     ...prev,
              //     [uuid]: {
              //       ...prev?.[uuid],
              //       value: e?.target?.value,
              //     },
              //   }));
              // }}
              // onClick={(e) => {
              //   if (isSelected) {
              //     pauseEvent(e);
              //   }
              // }}
              // value={value}
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
                  // checked={value as boolean}
                  compact
                  key={`${key}-${inputType}`}
                  // onCheck={(valFunc: (val: boolean) => boolean) => {
                  //   setAttributesMapping(prev => ({
                  //     ...prev,
                  //     [uuid]: {
                  //       ...prev?.[uuid],
                  //       value: valFunc(value as boolean),
                  //     },
                  //   }));
                  // }}
                  // pauseEvent={isSelected}
                />

                {name && (
                  <>
                    <Spacing ml={PADDING_UNITS} />

                    <FlexContainer flexDirection="column" fullWidth>
                      <Text bold large success>
                        {name}
                      </Text>

                      {description && description?.split('\n')?.map((line: string) => (
                        <Text default key={line}>
                          {line}
                        </Text>
                      ))}
                    </FlexContainer>
                  </>
                )}
              </FlexContainer>
            </Spacing>
          );
        }

        if (inputEls?.length >= 1) {
          row.push(
            <Spacing key={key} mt={itemIndex >= 1 ? PADDING_UNITS : 0}>
              {name && (
                <Spacing mb={1}>
                  <Text bold large success>
                    {name}
                  </Text>

                  {description && description?.split('\n')?.map((line: string) => (
                    <Text default key={line}>
                      {line}
                    </Text>
                  ))}
                </Spacing>
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
    variables,
  ]);

  return (
    <>
      {inputsMemo}
    </>
  );
}

export default InteractionDisplay;
