import React, { Dispatch, SetStateAction } from 'react';
import styled from 'styled-components';

import InputWrapper, { InputWrapperProps, SHARED_INPUT_STYLES } from './InputWrapper';
import dark from '@oracle/styles/themes/dark';

const HEIGHT = 26;
const WIDTH = 46;

type ToggleSwitchProps = {
  checked: boolean;
  disabled?: boolean;
  monotone?: boolean;
  onCheck: Dispatch<SetStateAction<boolean>>;
} & InputWrapperProps;

const ToggleSwitchStyle = styled.label<
  InputWrapperProps & {monotone?: boolean }
>`
  ${SHARED_INPUT_STYLES}

  position: relative;
  display: inline-block;
  width: ${WIDTH}px;
  min-width: ${WIDTH}px;
  height: ${HEIGHT}px;

  & input[type="checkbox"] {
    display: none;
  }

  & span {
    position: absolute;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    background-color: ${({ disabled }) => (disabled ? dark.monotone.white : dark.monotone.black)};
    border-radius: 13px;
    ${({ disabled }) => disabled && `border: 1px solid ${dark.monotone.grey200}`};
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transition: background-color 0.2s ease;
  }

  & span::before {
    position: absolute;
    content: "";
    left: 2px;
    top: 2px;
    width: 22px;
    height: 22px;
    background-color: #787A85;
    border-radius: 50%;
    transition: transform 0.3s ease;
  }

  & input[type="checkbox"]:checked + span::before {
    transform: translateX(20px);
  }

  ${(props) =>
    !props.disabled && !props.monotone && `
    & input[type="checkbox"]:checked + span {
      background-color: #6AA1E0;
    }

    & input[type="checkbox"]:checked + span::before {
      background-color: ${dark.monotone.white};
    }
  `}
`;

const ToggleSwitch = ({
  checked,
  disabled,
  onCheck,
  ...props
}: ToggleSwitchProps, ref) => (
  <InputWrapper
    {...props}
    disabled={disabled}
    input={
      <ToggleSwitchStyle
        {...props}
        disabled={disabled}
        noBackground
        noBorder
      >
        <input
          checked={checked}
          type="checkbox"
        />
        <span
          onClick={disabled
            ? null
            : () => onCheck?.(value => !value)
          }
        />
      </ToggleSwitchStyle>
    }
    noBackground
    ref={ref}
  />
);

export default React.forwardRef(ToggleSwitch);
