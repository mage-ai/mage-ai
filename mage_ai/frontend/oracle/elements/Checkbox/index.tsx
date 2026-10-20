import React from 'react';
import styled from 'styled-components';

import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { Check } from '@oracle/icons';
import { MetaType } from '@oracle/elements/Inputs/InputWrapper';
import { BORDER_STYLE, BORDER_WIDTH, OUTLINE_OFFSET } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export type CheckboxProps = {
  beforeIcon?: any;
  checked?: boolean;
  disabled?: boolean;
  errorMessage?: string[];
  label?: string | any;
  labelDescription?: string;
  large?: boolean;
  meta?: MetaType;
  monospace?: boolean;
  name?: string;
  onClick?: (e: Event) => void;
  required?: boolean;
  small?: boolean;
  type?: string;
  warning?: boolean;
  xsmall?: boolean;
};

const CheckboxContainer = styled.div`
  display: inline-block;
  vertical-align: middle;
  cursor: pointer;
`;

const ErrorContainer = styled.div`
  margin-top: 4px;
`;

// Hide checkbox visually but remain accessible to screen readers.
// Source: https://polished.js.org/docs/#hidevisually
const HiddenCheckbox = styled.input<{
  disabled?: any;
  notClickable?: boolean;
}>`
  border: 0;
  clip: rect(0 0 0 0);
  clippath: inset(50%);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;

  ${props => props.notClickable && `
    background-color: ${(props.theme.content || dark.content).disabled}
    border-color: ${(props.theme.content || dark.content).disabled}

    &:hover {
      cursor: not-allowed;
    }
  `}
`;

const StyledCheckbox = styled.div<CheckboxProps>`
  border-radius: ${UNIT * 0.5}px;
  height: ${2 * UNIT}px;
  transition: all 150ms;
  width: ${2 * UNIT}px;

  svg {
    position: relative;
    visibility: ${(props) => ((props.checked || props.required) ? 'visible' : 'hidden')};
  }

  ${props => props.large && `
    svg {
      left: -4px;
      top: -8px;
    }
  `}

  ${props => !props.checked && `
    background-color: ${(props.theme.background || dark.background).popup};
    border: ${OUTLINE_OFFSET}px ${BORDER_STYLE} ${(props.theme.content || dark.content).muted};
  `}

  ${props => props.checked && `
    background-color: ${(props.theme.interactive || dark.interactive).checked};
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} transparent;
  `}

  ${props => props.required && `
    background-color: ${(props.theme.content || dark.content).disabled};
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} transparent;
  `}

  input[disabled] {
    cursor: default;
  }

  ${props => props.disabled && `
    background-color: ${(props.theme.content || dark.content).disabled};
    border-color: ${(props.theme.content || dark.content).disabled};

    &:hover {
      cursor: not-allowed;
    }
  `}

  ${(props) => props.warning && `
    background-color: ${(props.theme.accent || dark.accent).warning};
    border-color: ${(props.theme.interactive || dark.interactive).defaultBorder}
  `}
`;

const LabelStyle = styled.label<CheckboxProps>`
  -ms-flex-direction: column;
  align-items: center;
  display: flex;
  flex-direction: column;
  flex-direction: row;

  &:hover {
    cursor: pointer;
  }
`;

const Checkbox = ({
  beforeIcon,
  checked,
  disabled,
  errorMessage,
  label,
  labelDescription,
  large,
  meta,
  monospace = false,
  onClick,
  required,
  small = false,
  warning,
  xsmall = false,
  ...props
}: CheckboxProps) => {
  const hasError: boolean = warning || !!(errorMessage || (meta && meta.touched && meta.error));

  return (
    <>
      <LabelStyle
        onClick={(e) => {
          e.preventDefault();
          if (onClick && !disabled) {
            onClick(e);
          }
        }}
      >
        <CheckboxContainer>
          <HiddenCheckbox
            {...props}
            disabled={disabled ? 'disabled' : undefined}
            notClickable={disabled}
          />
          <StyledCheckbox
            checked={checked}
            disabled={disabled}
            large={large}
            required={required}
            warning={hasError}
          >
            <Check
              size={UNIT * (large ? 3 : 2)}
            />
          </StyledCheckbox>
        </CheckboxContainer>

        {beforeIcon &&
          <Spacing ml={1}>
            <FlexContainer>
              {beforeIcon}
            </FlexContainer>
          </Spacing>
        }

        {label && (
          <Spacing pl={1}>
            {typeof label === 'string' && (
              <Text
                disabled={disabled}
                lineThrough={disabled}
                monospace={monospace}
                small={small}
                xsmall={xsmall}
              >
                {label}
              </Text>
            )}
            {typeof label !== 'string' && label}
            {labelDescription && <Text muted small>{labelDescription}</Text>}
          </Spacing>
        )}
      </LabelStyle>
      {(errorMessage || (meta && meta.touched && meta.error)) && (
        <ErrorContainer>
          <Text small warning>
            {errorMessage ? [...errorMessage] : meta.error}
          </Text>
        </ErrorContainer>
      )}
    </>
  );
};

export default Checkbox;
