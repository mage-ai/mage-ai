import { useMemo } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import InteractionType, {
  InteractionInputOptionType,
  InteractionInputStyleType,
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
import { BlockInteractionType } from '@interfaces/PipelineInteractionType';
import { PADDING_UNITS, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';

type BlockInteractionControllerProps = {
  blockInteraction: BlockInteractionType;
  interaction: InteractionType;
};

function BlockInteractionController({
  blockInteraction,
  interaction,
}: BlockInteractionControllerProps) {
  const {
    name: blockInteractionName,
    uuid: blockInteractionUUID,
  } = blockInteraction || {
    name: null,
    uuid: null,
  };
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
        const sharedProps = {};
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
                <Spacing key={label} mr={PADDING_UNITS}>
                  <Checkbox
                    {...sharedProps}
                    label={label}
                    // checked={!!value}
                    onClick={(e) => {
                      console.log(value, e.target.value);
                    }}
                  />
                </Spacing>
              ))}
            </FlexContainer>
          );
        } else if (InteractionInputTypeEnum.TEXT_FIELD === inputType) {
          if (style?.multiline) {
            inputEls.push(
              <TextArea
                {...sharedProps}
                key={`${key}-${inputType}`}
              />
            );
          } else {
            inputEls.push(
              <TextInput
                {...sharedProps}
                key={`${key}-${inputType}`}
              />
            );
          }
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
                <option key={value} value={value}>
                  {label || value}
                </option>
              ))}
            </Select>
          );
        } else if (InteractionInputTypeEnum.SWITCH === inputType) {
          row.push(
            <Spacing key={key} mt={itemIndex >= 1 ? PADDING_UNITS : 0}>
              <FlexContainer alignItems="center">
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
                  <Spacing ml={PADDING_UNITS}>
                    <Text bold large success>
                      {name}
                    </Text>

                    {description && (
                      <Text default>
                        {description}
                      </Text>

                    )}
                  </Spacing>
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

                  {description && (
                    <Text default>
                      {description}
                    </Text>

                  )}
                </Spacing>
              )}

              {inputEls}
            </Spacing>
          );
        }
      });

      rows.push(
        <Spacing
          key={`${blockInteractionUUID}-row-${rowIndex}`}
          mt={rowIndex >= 1 ? UNITS_BETWEEN_ITEMS_IN_SECTIONS : 0}
        >
          {row}
        </Spacing>
      );
    });

    return rows;
  }, [
    blockInteractionUUID,
    inputs,
    layout,
    variables,
  ]);

  return (
    <>
      {blockInteractionName && (
        <Spacing mb={PADDING_UNITS}>
          <Headline default level={4}>
            {blockInteractionName}
          </Headline>
        </Spacing>
      )}

      {inputsMemo}
    </>
  );
}

export default BlockInteractionController;
