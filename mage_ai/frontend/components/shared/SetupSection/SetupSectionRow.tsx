import React, { Dispatch, SetStateAction } from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { Edit } from '@oracle/icons';
import { ICON_SIZE } from '@components/shared/index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type SetupSectionRowProps = {
  children?: any;
  description?: any | string;
  invalid?: boolean;
  textInput?: {
    onChange?: (event: any) => void;
    placeholder?: string;
    value?: string;
  };
  title: string;
  toggleSwitch?: {
    checked?: boolean;
    onCheck?: Dispatch<SetStateAction<boolean>>;
  };
};

function SetupSectionRow({
  children,
  description,
  invalid,
  textInput,
  title,
  toggleSwitch,
}: SetupSectionRowProps) {
  return (
    <Spacing p={PADDING_UNITS}>
      <FlexContainer alignItems="center">
        <FlexContainer flexDirection="column">
          <Text
            danger={invalid}
            default
            large
          >
            {title} {invalid && (
              <Text danger inline large>
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

        <Spacing mr={PADDING_UNITS} />

        <Flex flex={1} justifyContent="flex-end">
          {children}

          {textInput && (
            <TextInput
              afterIcon={<Edit />}
              afterIconClick={(_, inputRef) => {
                inputRef?.current?.focus();
              }}
              afterIconSize={ICON_SIZE}
              alignRight
              autoComplete="off"
              large
              noBackground
              noBorder
              fullWidth
              onChange={textInput?.onChange}
              paddingHorizontal={0}
              paddingVertical={0}
              placeholder={textInput?.placeholder}
              setContentOnMount
              value={textInput?.value || ''}
            />
          )}

          {toggleSwitch && (
            <ToggleSwitch
              checked={!!toggleSwitch?.checked}
              compact
              onCheck={toggleSwitch?.onCheck}
            />
          )}
        </Flex>
      </FlexContainer>
    </Spacing>
  );
}

export default SetupSectionRow;
