import React, { Dispatch, SetStateAction, useMemo } from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Select from '@oracle/elements/Inputs/Select';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { ChevronDown, Edit } from '@oracle/icons';
import { ICON_SIZE } from '@components/shared/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

interface InputType {
  compact?: boolean;
  fullWidth?: boolean;
  monospace?: boolean;
  multiline?: boolean;
  onChange?: (event: any) => void;
  placeholder?: string;
  type?: string;
  value?: string | number;
}

type SetupSectionRowProps = {
  children?: any;
  description?: any | string;
  inputFlex?: number;
  invalid?: boolean;
  large?: boolean;
  selectInput?: InputType & {
    options: {
      label?: string;
      value: any;
    }[];
  };
  textInput?: InputType;
  title?: string | any;
  toggleSwitch?: {
    checked?: boolean;
    onCheck?: Dispatch<SetStateAction<boolean>>;
  };
  warning?: boolean;
};

function SetupSectionRow({
  children,
  description,
  inputFlex = 3,
  invalid,
  large = true,
  selectInput,
  textInput,
  title,
  toggleSwitch,
  warning,
}: SetupSectionRowProps) {
  const textInputMemo = useMemo(() => {
    if (!textInput) {
      return null;
    }

    const TextInputElement = textInput?.multiline ? TextArea : TextInput;

    return (
      <TextInputElement
        afterIcon={<Edit />}
        afterIconClick={(_, inputRef) => {
          inputRef?.current?.focus();
        }}
        afterIconSize={ICON_SIZE}
        alignRight
        autoComplete="off"
        fullWidth
        large={large}
        noBackground
        noBorder
        paddingHorizontal={0}
        paddingVertical={0}
        setContentOnMount
        {...textInput}
      />
    );
  }, [large, textInput]);

  return (
    <div style={{ padding: PADDING_UNITS * UNIT }}>
      <FlexContainer alignItems="center">
        <FlexContainer
          flex={1}
          flexDirection="column"
          style={{ paddingRight: PADDING_UNITS * UNIT }}
        >
          <Text
            danger={invalid}
            default
            large={large}
            warning={warning}
          >
            {title} {invalid && (
              <Text danger inline large={large}>
                is required
              </Text>
            )}
          </Text>

          {description && typeof description === 'string' && (
            <Text muted small>
              {description}
            </Text>
          )}
          {description && typeof description !== 'string' && description}
        </FlexContainer>

        <Flex flex={inputFlex} justifyContent="flex-end">
          {children}

          {textInputMemo}

          {selectInput && (
            <Select
              {...selectInput}
              afterIcon={<ChevronDown />}
              afterIconSize={ICON_SIZE}
              alignRight
              autoComplete="off"
              large={large}
              noBackground
              noBorder
              paddingHorizontal={0}
              paddingVertical={0}
              setContentOnMount
            >
              {selectInput?.options?.map(({
                label,
                value,
              }, idx: number) => (
                <option key={`${value}-${label}-${idx}`} value={value}>
                  {label || value}
                </option>
              ))}
            </Select>
          )}

          {toggleSwitch && (
            <ToggleSwitch
              checked={!!toggleSwitch?.checked}
              compact
              onCheck={toggleSwitch?.onCheck}
              pauseEvent
            />
          )}
        </Flex>
      </FlexContainer>
    </div>
  );
}

export default SetupSectionRow;
