import React, { useRef, useState } from 'react';
import styled from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text, { TextProps } from '@oracle/elements/Text';
import TextInput, { TextInputProps } from '@oracle/elements/Inputs/TextInput';
import Tooltip, { TooltipProps } from '@oracle/components/Tooltip';
import { UNIT } from '@oracle/styles/units/spacing';

export type LabelWithValueClickerProps = {
  bold?: boolean;
  defaultColor?: boolean;
  description?: string;
  disableWordBreak?: boolean;
  inputValue?: string;
  inputWidth?: number;
  invertedTheme?: boolean;
  label?: string;
  menuOpen?: boolean;
  muted?: boolean;
  onClick: () => void;
  notRequired?: boolean;
  selectedTextProps?: TextProps;
  stacked?: boolean;
  tooltipProps?: TooltipProps;
  value?: string;
} & TextInputProps;

const LabelStyle = styled.div`
  margin-bottom: ${UNIT * 0.25}px;
`;

const DescriptionStyle = styled.div``;

function LabelWithValueClicker({
  bold = true,
  defaultColor,
  description,
  disableWordBreak,
  inputValue,
  inputWidth,
  invertedTheme,
  label,
  menuOpen = false,
  monospace,
  muted,
  onClick,
  notRequired,
  selectedTextProps,
  small,
  stacked,
  tooltipProps,
  value,
  ...props
}: LabelWithValueClickerProps) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const labelEl = label && (
    <>
      <Text bold={bold} inverted={invertedTheme} lineHeight={20} monospace={monospace} muted={muted} small={small}>
        {label}
      </Text>

      {tooltipProps && (
        <Spacing ml={1}>
          <Tooltip muted {...tooltipProps} />
        </Spacing>
      )}
    </>
  );
  const inputEl = (
    <>
      {value && (
        <Link
          block
          danger={selectedTextProps?.danger}
          fullWidth
          muted={muted}
          onClick={() => {
            onClick();
            if (inputRef.current) {
              inputRef.current.focus();
            }
            setFocused(true);
          }}
          preventDefault
          sameColorAsText={
            muted || (!selectedTextProps?.primary && !selectedTextProps?.danger && !selectedTextProps?.warning)
          }
          underline={selectedTextProps?.underline}
          warning={selectedTextProps?.warning}
        >
          <Text
            inverted={invertedTheme}
            muted={muted}
            {...selectedTextProps}
            disableWordBreak={disableWordBreak}
            monospace={monospace}
            small={small}
            width={inputWidth}
          >
            {value}
          </Text>
        </Link>
      )}

      <TextInput
        {...props}
        basic
        defaultColor={defaultColor}
        invertedTheme={invertedTheme}
        monospace={monospace}
        onBlur={(e) => {
          setFocused(false);
          if (props.onBlur) {
            props.onBlur(e);
          }
          if (!touched) {
            setTouched(true);
          }
        }}
        onFocus={(e) => {
          setFocused(true);
          if (props.onFocus) {
            props.onFocus(e);
          }
        }}
        ref={inputRef}
        small={small}
        value={inputValue}
        visible={!value}
      />
    </>
  );

  const descriptionEl = description && (
    <DescriptionStyle>
      <Text
        // @ts-ignore
        dangerouslySetInnerHTML={{ __html: description }}
        monospace={monospace}
        muted
        small={small}
      />
    </DescriptionStyle>
  );

  return (
    <>
      {stacked && (
        <>
          {labelEl && (
            <LabelStyle>
              <FlexContainer alignItems="center" fullHeight={false} fullWidth>
                {labelEl}
              </FlexContainer>

              {descriptionEl}
            </LabelStyle>
          )}

          {inputEl}
        </>
      )}

      {!stacked && (
        <FlexContainer alignItems="center" fullWidth>
          {labelEl && (
            <>
              {labelEl}
              <Spacing ml={1} />
            </>
          )}


          <Flex flex="1">{inputEl}</Flex>
        </FlexContainer>
      )}

      {/*
        Showing an error message might cause the FeaturesDropdownSelect
        to not work when you click on a row in the dropdown menu.
      */}
      {touched && !focused && !value && !menuOpen && !notRequired && (
        <Text danger small={small}>
          This field is required.
        </Text>
      )}
    </>
  );
}

export default LabelWithValueClicker;
