import React from 'react';
import styled from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import light from '@oracle/styles/themes/light';
import {
  BORDER_RADIUS,
  BORDER_RADIUS_SMALL,
  BORDER_STYLE,
  OUTLINE_WIDTH,
} from '@oracle/styles/units/borders';
import { FONT_FAMILY_BOLD } from '@oracle/styles/fonts/primary';
import { LARGE, REGULAR, SMALL } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

export type ButtonProps = {
  afterIcon?: any;
  backgroundColor?: string;
  basic?: boolean;
  beforeIcon?: any;
  borderRadiusLeft?: boolean;
  borderRadiusRight?: boolean;
  children?: any;
  danger?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
  id?: string;
  large?: boolean;
  loading?: boolean;
  minWidth?: number;
  noBackground?: boolean;
  noBorder?: boolean;
  noBorderRight?: boolean;
  noPadding?: boolean;
  notClickable?: boolean;
  onClick?: (e?: Event | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  padding?: string;
  primary?: boolean;
  selected?: boolean;
  selectedAlt?: boolean;
  small?: boolean;
  smallBorderRadius?: boolean;
  success?: boolean;
  target?: string;
  title?: string;
  transparent?: boolean;
  width?: number;
};

const ButtonStyle = styled.button<ButtonProps>`
  border: none;
  display: block;
  font-family: ${FONT_FAMILY_BOLD};
  padding: 7px ${UNIT * 2}px;
  position: relative;
  z-index: 0;

  ${props => `
    border-color: ${(props.theme.interactive || light.interactive).defaultBorder};
    color: ${(props.theme.content || light.content).active};
  `}

  ${props => !props.noBackground && `
    background-color: ${(props.theme.background || light.background).row};
  `}

  ${props => props.noBackground && `
    background-color: transparent;
  `}

  ${props => props.padding && `
    padding: ${props.padding};
  `}

  ${props => props.noPadding && `
    padding: 0;
  `}

  ${props => props.notClickable && `
    &:hover,
    &:focus {
      cursor: default;
    }
  `}

  ${props => !props.basic && `
    border-style: ${BORDER_STYLE};
    border-width: 1px;
  `}

  ${props => !props.borderRadiusLeft && !props.borderRadiusRight && !props.noBorder && `
    border-radius: ${BORDER_RADIUS}px;
  `}

  ${props => props.noBorder && `
    border: none;
  `}

  ${props => props.smallBorderRadius && `
    border-radius: ${BORDER_RADIUS_SMALL}px;
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

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}

  ${props => props.danger && `
    background-color: ${(props.theme.background || light.background).danger};
  `}

  ${props => props.success && `
    background-color: ${(props.theme.background || light.background).success};
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

  ${props => !props.disabled && !props.notClickable && `
    &:hover {
      border-color: ${(props.theme.interactive || light.interactive).hoverBorder};
    }
    &:active {
      border-color: ${(props.theme.content || light.content).active};
    }
  `}

  ${props => props.primary && !props.disabled && `
    background-color: ${(props.theme.interactive || light.interactive).linkPrimary};
    color: ${(props.theme.monotone || light.monotone).white};
    border-color: ${(props.theme.interactive || light.interactive).linkPrimary};
    &:hover {
      border-color: ${(props.theme.monotone || light.monotone).black};
    }
  `}

  ${props => props.disabled && `
    color: ${(props.theme.interactive || light.interactive).disabledBorder};
    &:hover {
      cursor: not-allowed;
    }
  `}

  ${props => props.selected && `
    border-color: ${(props.theme.content || light.content).active};
  `}

  ${props => props.selectedAlt && `
    border: ${OUTLINE_WIDTH}px ${BORDER_STYLE} ${(props.theme.monotone || light.monotone).white};
    box-shadow: 0 0 0 0.5px ${(props.theme.interactive || light.interactive).defaultBorder};
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => props.minWidth && `
    min-width: ${props.minWidth}px;
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}
`;

const Button = ({
  afterIcon,
  beforeIcon,
  children,
  disabled,
  id,
  loading,
  onClick,
  ...props
}: ButtonProps, ref) => {
  const iconProps = {
    disabled,
    size: UNIT * 1.5,
  };

  return (
    <ButtonStyle
      {...props}
      disabled={disabled}
      id={id}
      onClick={(e) => {
        e?.preventDefault();
        onClick?.(e);
      }}
      ref={ref}
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

export default React.forwardRef(Button);
