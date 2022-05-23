import React from 'react';
import styled from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import { UNIT } from '@oracle/styles/units/spacing';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { FONT_FAMILY_BOLD } from '@oracle/styles/fonts/primary';
import light from '@oracle/styles/themes/light';

export type ButtonProps = {
  afterIcon?: any;
  beforeIcon?: any;
  children?: any;
  disabled?: boolean;
  iconOnly?: boolean;
  onClick?: (e?: Event | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  primary?: boolean;
  selected?: boolean;
  target?: string;
  width?: number;
};

const ButtonStyle = styled.button<ButtonProps>`
  background-color: ${light.button.default.background};
  border: none;
  border-color: ${light.button.default.lines};
  border-radius: ${BORDER_RADIUS}px;
  border-style: solid;
  border-width: 1px;
  color: ${light.button.default.color};
  display: block;
  font-family: ${FONT_FAMILY_BOLD};
  position: relative;
  padding: 10px 16px;
  z-index: 0;

  ${props => !props.disabled && `
    &:hover {
      border-color: ${light.button.default.hover};
    }
    &:active {
      border-color: ${light.button.selected};
      background: ${light.button.default.inverted};
    }
  `}

  ${props => props.primary && !props.disabled && `
    background-color: ${light.button.primary.background};
    color: ${light.button.primary.color};
    border-color: ${light.button.primary.lines};
    &:hover {
      border-color: ${light.button.primary.hover};
    }
    &:active {
      border-color: ${light.button.selected};
      background: ${light.button.primary.inverted};
    }
  `}

  ${props => props.disabled && `
    color: ${light.button.disabled};
    &:hover {
      cursor: not-allowed;
    }
  `}

  ${props => props.selected && `
    border-color: ${light.button.selected};
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}
`;

const Button = ({
  afterIcon,
  beforeIcon,
  children,
  disabled,
  iconOnly,
  onClick,
  ...props
}: ButtonProps) => {
  const iconProps = {
    disabled,
    size: UNIT * 3,
  };

  return (
    <ButtonStyle
      {...props}
      disabled={disabled}
      onClick={(e) => {
        e?.preventDefault();
        onClick?.(e);
      }}
    >
      <FlexContainer
        alignItems="center"
        justifyContent="center"
      >
        {beforeIcon && (
          <Spacing mr={1}>
            <Flex>
              {React.cloneElement(beforeIcon, {
                ...iconProps,
                size: beforeIcon.props?.size || iconProps.size,
              })}
            </Flex>
          </Spacing>
        )}
        <Flex>
          {children}
        </Flex>
        {afterIcon && (
          <Spacing ml={1}>
            <Flex>
              {React.cloneElement(afterIcon, {
                ...iconProps,
                size: afterIcon.props?.size || iconProps.size,
              })}
            </Flex>
          </Spacing>
        )}
      </FlexContainer>
    </ButtonStyle>
  );
};

export default Button;
