import React, { Dispatch, SetStateAction } from 'react';
import styled from 'styled-components';

import InputWrapper, { InputWrapperProps, SHARED_INPUT_STYLES } from './InputWrapper';
import dark from '@oracle/styles/themes/dark';
import { pauseEvent as pauseEventFunc } from '@utils/events';

const HEIGHT = 26;
const WIDTH = 46;
const COMPACT_HEIGHT = 20;
const COMPACT_WIDTH = 35;

type ToggleSwitchProps = {
  checked?: boolean;
  compact?: boolean;
  disabled?: boolean;
  id?: string;
  monotone?: boolean;
  onCheck?: Dispatch<SetStateAction<boolean>>;
  pauseEvent?: boolean;
  purpleBackground?: boolean;
} & InputWrapperProps;

const ToggleSwitchStyle = styled.label<
  InputWrapperProps & {
    compact?: boolean;
    monotone?: boolean;
    purpleBackground?: boolean;
  }
>`
  ${SHARED_INPUT_STYLES}

  position: relative;
  display: inline-block;
  width: ${WIDTH}px;
  min-width: ${WIDTH}px;
  height: ${HEIGHT}px;

  ${props => props.compact && `
    width: ${COMPACT_WIDTH}px;
    min-width: ${COMPACT_WIDTH}px;
    height: ${COMPACT_HEIGHT}px;
  `}

  & input[type="checkbox"] {
    display: none;
  }

  & span {
    position: absolute;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    background-color: ${({ disabled }) => (disabled ? dark.monotone.white : dark.monotone.black)};
    border-radius: 13px;
    ${({ disabled, compact }) => (disabled && !compact) && `border: 1px solid ${dark.monotone.grey200}`};
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transition: background-color 0.2s ease;
  }

  & span::before {
    position: absolute;
    content: "";
    left: ${({ compact }) => (compact ? '1' : '2')}px;
    top: ${({ compact }) => (compact ? '1' : '2')}px;
    width: ${({ compact }) => (compact ? '18' : '22')}px;
    height: ${({ compact }) => (compact ? '18' : '22')}px;
    background-color: #787A85;
    border-radius: 50%;
    transition: transform 0.3s ease;
  }

  & input[type="checkbox"]:checked + span::before {
    transform: ${({ compact }) => (compact ? 'translateX(15px)' : 'translateX(20px)')};
  }

  ${props => !props.disabled && !props.monotone && `
    & input[type="checkbox"]:checked + span {
      background-color: ${dark.accent.sky};
    }

    & input[type="checkbox"]:checked + span::before {
      background-color: ${dark.monotone.white};
    }
  `}

  ${({ purpleBackground }) => purpleBackground && `
    & input[type="checkbox"]:checked + span {
      background-color: ${dark.interactive.purple};
    }
  `}
`;

const ToggleSwitch = ({
  checked,
  disabled,
  id,
  onCheck,
  pauseEvent = true,
  ...props
}: ToggleSwitchProps, ref) => (
  <InputWrapper
    {...props}
    disabled={disabled}
    input={
      <ToggleSwitchStyle
        {...props}
        disabled={disabled}
        id={id}
        noBackground
        noBorder
      >
        <input
          checked={checked}
          id={id ? `${id}_input` : null}
          readOnly
          type="checkbox"
        />
        <span
          onClick={disabled
            ? null
            : (e) => {
              if (pauseEvent) {
                pauseEventFunc(e);
              }
              onCheck?.(value => !value);
            }
          }
        />
      </ToggleSwitchStyle>
    }
    noBackground
    ref={ref}
  />
);

export default React.forwardRef(ToggleSwitch);
