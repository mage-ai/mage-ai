import React from 'react';
import styled from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import { UNIT } from '@oracle/styles/units/spacing';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { FONT_FAMILY_BOLD } from '@oracle/styles/fonts/primary';
import light from '@oracle/styles/themes/light';
import Spinner from '@oracle/components/Spinner';
import { LARGE, REGULAR, SMALL } from '@oracle/styles/fonts/sizes';

export type ButtonProps = {
  afterIcon?: any;
  basic?: boolean;
  beforeIcon?: any;
  borderRadiusLeft?: boolean;
  borderRadiusRight?: boolean;
  children?: any;
  disabled?: boolean;
  iconOnly?: boolean;
  large?: boolean;
  loading?: boolean;
  noBorder?: boolean;
  noBorderRight?: boolean;
  onClick?: (e?: Event | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  padding?: string;
  primary?: boolean;
  small?: boolean;
  selected?: boolean;
  target?: string;
  transparent?: boolean;
  width?: number;
};

const ButtonStyle = styled.button<ButtonProps>`
  background-color: ${light.background.row};
  border: none;
  border-color: ${light.interactive.defaultBorder};
  color: ${light.content.active};
  display: block;
  font-family: ${FONT_FAMILY_BOLD};

  padding: 7px 16px;
  position: relative;
  z-index: 0;

  ${props => props.padding && `
    padding: ${props.padding};
  `}

  ${props => !props.basic && `
    border-style: solid;
    border-width: 1px;
  `}

  ${props => !props.borderRadiusLeft && !props.borderRadiusRight && !props.noBorder && `
    border-radius: ${BORDER_RADIUS}px;
  `}

  ${props => !props.borderRadiusLeft && props.borderRadiusRight && `
    border-radius: 0px ${BORDER_RADIUS}px ${BORDER_RADIUS}px 0px;
  `}

  ${props => props.borderRadiusLeft && !props.borderRadiusRight && `
    border-radius: ${BORDER_RADIUS}px 0px 0px ${BORDER_RADIUS}px;
  `}

  ${props => props.noBorderRight && `
    border-right: none;
  `}

  ${props => !props.iconOnly && props.large && `
    ${LARGE}
  `}

  ${props => !props.iconOnly && !props.large && !props.small && `
    ${REGULAR}
  `}

  ${props => !props.iconOnly && props.small && `
    ${SMALL}
  `}

  ${props => props.transparent && `
    background-color: transparent; !important
  `}

  ${props => !props.disabled && `
    &:hover {
      border-color: ${light.interactive.hoverBorder};
    }
    &:active {
      border-color: ${light.content.active};
    }
  `}

  ${props => props.primary && !props.disabled && `
    background-color: ${light.interactive.linkPrimary};
    color: ${light.monotone.white};
    border-color: ${light.interactive.linkPrimary};
    &:hover {
      border-color: ${light.monotone.black};
    }
    &:active {
      background: ${light.interactive.focusBackground};
    }
  `}

  ${props => props.disabled && `
    color: ${light.interactive.disabledBorder};
    &:hover {
      cursor: not-allowed;
    }
  `}

  ${props => props.selected && `
    border-color: ${light.content.active};
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
  loading,
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
        {!loading && beforeIcon && (
          <Spacing mr={1}>
            <Flex>
              {React.cloneElement(beforeIcon, {
                ...iconProps,
                size: beforeIcon.props?.size || iconProps.size,
              })}
            </Flex>
          </Spacing>
        )}
        {loading && <Spinner />}
        {!loading && (
          <Flex>
            {children}
          </Flex>
        )}
        {!loading && afterIcon && (
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
