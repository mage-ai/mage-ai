import styled, { css } from 'styled-components';

import light from '@oracle/styles/themes/light';
import { DEFAULT_SIZE } from './shared/constants';

export type BaseIconProps = {
  black?: boolean;
  clipRule?: string;
  color?: string;
  default?: boolean;
  disabled?: boolean;
  earth?: boolean;
  fill?: string;
  fillRule?: string;
  fire?: boolean;
  info?: boolean;
  inverted?: boolean;
  invertedTheme?: boolean;
  muted?: boolean;
  negative?: boolean;
  neutral100?: boolean;
  neutral300?: boolean;
  opacity?: number;
  positive?: boolean;
  primary?: boolean;
  size?: number;
  stroke?: string;
  style?: any;
  useModelTheme?: boolean;
  useStroke?: boolean;
  viewBox?: string;
  warning?: boolean;
  water?: boolean;
  wind?: boolean;
};

type BaseIconInternalProps = {
  children: any;
  title?: string;
};

export const SVGStyle = styled.svg``;

export const SHARED_STYLES = css`

  ${props => props.fill && typeof props.fill !== 'undefined' && `
    fill: ${props.fill};
  `}

  ${props => props.stroke && `
    stroke: ${props.stroke};
  `}

  ${props => !props.useStroke && !props.stroke && !props.fill && !props.disabled && !props.invertedTheme && `
    fill: ${(props.theme.content || light.content).active};
  `}

  ${props => props.useStroke && !props.stroke && !props.fill && !props.disabled && !props.invertedTheme && `
    stroke: ${(props.theme.content || light.content).active};
  `}

  ${props => !props.useStroke && props.inverted && !props.disabled && !props.invertedTheme && `
    fill: ${(props.theme.content || light.content).inverted};
  `}

  ${props => !props.useStroke && props.muted && !props.disabled && !props.invertedTheme && `
    fill: ${(props.theme.monotone || light.monotone).grey300};
  `}

  ${props => !props.useStroke && props.default && !props.disabled && !props.invertedTheme && `
    fill: ${(props.theme.monotone || light.monotone).grey500};
  `}

  ${props => !props.useStroke && props.disabled && !props.invertedTheme && `
    fill: ${(props.theme.content || light.content).disabled};
  `}

  ${props => !props.useStroke && props.black && `
    fill: ${(props.theme.monotone || light.monotone).black};
  `}

  ${props => props.useStroke && props.black && `
    stroke: ${(props.theme.monotone || light.monotone).black};
  `}

  ${props => props.useStroke && props.inverted && !props.disabled && !props.invertedTheme && `
    stroke: ${(props.theme.content || light.content).inverted};
  `}

  ${props => props.useStroke && props.muted && !props.disabled && !props.invertedTheme && `
    stroke: ${(props.theme.monotone || light.monotone).grey300};
  `}

  ${props => props.useStroke && props.default && !props.disabled && !props.invertedTheme && `
    stroke: ${(props.theme.monotone || light.monotone).grey500};
  `}

  ${props => props.useStroke && props.disabled && !props.invertedTheme && `
    stroke: ${(props.theme.content || light.content).disabled};
  `}

  ${props => props.useStroke && !props.disabled && props.primary && `
    stroke: ${(props.theme.interactive || light.interactive).primaryAction};
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
  fill,
  opacity,
  size = DEFAULT_SIZE,
  style,
  title = 'icon',
  viewBox = '0 0 24 24',
}: BaseIconProps & BaseIconInternalProps) => (
  <SVGStyle
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
