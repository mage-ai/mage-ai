import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { DEFAULT_SIZE } from './shared/constants';

export type BaseIconProps = {
  active?: boolean;
  black?: boolean;
  className?: string;
  danger?: boolean;
  default?: boolean;
  disabled?: boolean;
  earth?: boolean;
  fill?: string;
  highlight?: boolean;
  inverted?: boolean;
  neutral?: boolean;
  muted?: boolean;
  opacity?: number;
  pink?: boolean;
  primary?: boolean;
  secondary?: boolean;
  size?: number;
  stroke?: string;
  style?: any;
  success?: boolean;
  useStroke?: boolean;
  viewBox?: string;
  warning?: boolean;
};

type BaseIconInternalProps = {
  children: any;
};

export const SVGStyle = styled.svg<BaseIconInternalProps>``;

export const SHARED_STYLES = css<any>`
  ${props => props.fill && typeof props.fill !== 'undefined' && `
    fill: ${props.fill};
  `}

  ${props => props.stroke && `
    stroke: ${props.stroke};
  `}

  ${props => !props.useStroke && props.neutral && !props.stroke && !props.fill && !props.disabled && `
    fill: ${(props.theme.icons || dark.icons).neutral} !important;
  `}
  ${props => !props.useStroke && !props.stroke && !props.fill && !props.disabled && `
    fill: ${(props.theme.content || dark.content).active};
  `}
  ${props => !props.useStroke && props.active && !props.disabled && `
    fill: ${(props.theme.content || dark.content).active} !important;
  `}
  ${props => !props.useStroke && !props.stroke && !props.fill && !props.disabled && props.inverted && `
    fill: ${(props.theme.content || dark.content).inverted};
  `}
  ${props => !props.useStroke && !props.stroke && !props.fill && props.warning && `
    fill: ${(props.theme.accent || dark.accent).warning};
  `}
  ${props => !props.useStroke && props.muted && !props.disabled && `
    fill: ${(props.theme.content || dark.content).muted} !important;
  `}
  ${props => !props.useStroke && props.default && !props.disabled && `
    fill: ${(props.theme.monotone || dark.monotone).gray};
  `}
  ${props => !props.useStroke && props.disabled && `
    fill: ${(props.theme.content || dark.content).disabled};
  `}
  ${props => !props.useStroke && props.black && `
    fill: ${(props.theme.content || dark.content).inverted};
  `}
  ${props => !props.useStroke && props.pink && `
    fill: ${(props.theme.accent || dark.accent).pink};
  `}
  ${props => !props.useStroke && props.highlight && `
    fill: ${(props.theme.background || dark.background).menu};
  `}
  ${props => !props.useStroke && !props.disabled && props.primary && `
    fill: ${(props.theme.interactive || dark.interactive).linkPrimary};
  `}
  ${props => !props.useStroke && !props.disabled && props.secondary && `
    fill: ${(props.theme.interactive || dark.interactive).linkSecondary};
  `}
  ${props => !props.useStroke && !props.disabled && props.earth && `
    fill: ${(props.theme.brand || dark.brand).earth500};
  `}
  ${props => !props.useStroke && !props.disabled && props.danger && `
    fill: ${(props.theme.status || dark.status).negative};
  `}
  ${props => !props.useStroke && !props.disabled && props.success && `
    fill: ${(props.theme.status || dark.status).positive};
  `}

  ${props => props.useStroke && props.neutral && !props.stroke && !props.fill && !props.disabled && `
    stroke: ${(props.theme.icons || dark.icons).neutral} !important;
  `}
  ${props => props.useStroke && !props.stroke && !props.fill && !props.disabled && `
    stroke: ${(props.theme.content || dark.content).active};
  `}
  ${props => props.useStroke && props.active && !props.disabled && `
    stroke: ${(props.theme.content || dark.content).active};
  `}
  ${props => props.useStroke && !props.stroke && !props.fill && !props.disabled && props.inverted && `
    stroke: ${(props.theme.content || dark.content).inverted};
  `}
  ${props => props.useStroke && !props.stroke && !props.fill && props.warning && `
    stroke: ${(props.theme.accent || dark.accent).warning};
  `}
  ${props => props.useStroke && props.muted && !props.disabled && `
    stroke: ${(props.theme.content || dark.content).muted} !important;
  `}
  ${props => props.useStroke && props.default && !props.disabled && `
    stroke: ${(props.theme.monotone || dark.monotone).gray};
  `}
  ${props => props.useStroke && props.disabled && `
    stroke: ${(props.theme.content || dark.content).disabled};
  `}
  ${props => props.useStroke && props.black && `
    stroke: ${(props.theme.content || dark.content).inverted};
  `}
  ${props => props.useStroke && props.pink && `
    stroke: ${(props.theme.accent || dark.accent).pink};
  `}
  ${props => props.useStroke && props.highlight && `
    stroke: ${(props.theme.background || dark.background).menu};
  `}
  ${props => props.useStroke && !props.disabled && props.primary && `
    stroke: ${(props.theme.interactive || dark.interactive).linkPrimary};
  `}
  ${props => props.useStroke && !props.disabled && props.secondary && `
    stroke: ${(props.theme.interactive || dark.interactive).linkSecondary};
  `}
  ${props => props.useStroke && !props.disabled && props.earth && `
    stroke: ${(props.theme.brand || dark.brand).earth500};
  `}
  ${props => props.useStroke && !props.disabled && props.danger && `
    stroke: ${(props.theme.status || dark.status).negative};
  `}
  ${props => props.useStroke && !props.disabled && props.success && `
    stroke: ${(props.theme.status || dark.status).positive};
  `}
`;

export const CircleStyle = styled.circle`
  ${SHARED_STYLES}
`;

export const MaskStyle = styled.mask`
  ${SHARED_STYLES}
`;

export const PathStyle = styled.path`
  ${SHARED_STYLES}
`;

export const RectStyle = styled.rect`
  ${SHARED_STYLES}
`;

export const EllipseStyle = styled.ellipse`
  ${SHARED_STYLES}
`;

const BaseIcon = ({
  children,
  className,
  fill,
  opacity,
  size = DEFAULT_SIZE,
  style,
  viewBox = '0 0 12 12',
}: BaseIconProps & BaseIconInternalProps) => (
  <SVGStyle
    className={className}
    fill={fill}
    height={size}
    opacity={opacity}
    style={style}
    viewBox={viewBox}
    width={size}
  >
    {children}
  </SVGStyle>
);

export default BaseIcon;
