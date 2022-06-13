import styled, { css } from 'styled-components';

import light from '@oracle/styles/themes/light';
import { DEFAULT_SIZE } from './shared/constants';

export type BaseIconProps = {
  black?: boolean;
  default?: boolean;
  disabled?: boolean;
  earth?: boolean;
  fill?: string;
  muted?: boolean;
  negative?: boolean;
  opacity?: number;
  positive?: boolean;
  primary?: boolean;
  secondary?: boolean;
  size?: number;
  stroke?: string;
  style?: any;
  useStroke?: boolean;
  viewBox?: string;
};

type BaseIconInternalProps = {
  children: any;
  title?: string;
};

export const SVGStyle = styled.svg``;

export const SHARED_STYLES = css<any>`

  ${props => props.fill && typeof props.fill !== 'undefined' && `
    fill: ${props.fill};
  `}

  ${props => props.stroke && `
    stroke: ${props.stroke};
  `}

  ${props => !props.useStroke && !props.stroke && !props.fill && !props.disabled && `
    fill: ${(props.theme.content || light.content).active};
  `}

  ${props => props.useStroke && !props.stroke && !props.fill && !props.disabled && `
    stroke: ${(props.theme.content || light.content).active};
  `}

  ${props => !props.useStroke && props.muted && !props.disabled && `
    fill: ${(props.theme.monotone || light.monotone).gray};
  `}

  ${props => !props.useStroke && props.default && !props.disabled && `
    fill: ${(props.theme.monotone || light.monotone).gray};
  `}

  ${props => !props.useStroke && props.disabled && `
    fill: ${(props.theme.content || light.content).disabled};
  `}

  ${props => !props.useStroke && props.black && `
    fill: ${(props.theme.monotone || light.monotone).black};
  `}

  ${props => props.useStroke && props.black && `
    stroke: ${(props.theme.monotone || light.monotone).black};
  `}

  ${props => props.useStroke && props.muted && !props.disabled && `
    stroke: ${(props.theme.monotone || light.monotone).gray};
  `}

  ${props => props.useStroke && props.default && !props.disabled && `
    stroke: ${(props.theme.monotone || light.monotone).gray};
  `}

  ${props => props.useStroke && props.disabled && `
    stroke: ${(props.theme.content || light.content).disabled};
  `}

  ${props => props.useStroke && !props.disabled && props.primary && `
    stroke: ${(props.theme.interactive || light.interactive).linkPrimary};
  `}

  ${props => !props.useStroke && !props.disabled && props.primary && `
    fill: ${(props.theme.interactive || light.interactive).linkPrimary};
  `}

  ${props => props.useStroke && !props.disabled && props.secondary && `
    stroke: ${(props.theme.interactive || light.interactive).linkSecondary};
  `}

  ${props => !props.useStroke && !props.disabled && props.secondary && `
    fill: ${(props.theme.interactive || light.interactive).linkSecondary};
  `}

  ${props => !props.disabled && props.earth && `
    fill: ${(props.theme.brand || light.brand).earth500};
  `}

  ${props => !props.disabled && props.negative && `
    fill: ${(props.theme.percentage || light.percentage).negative};
  `}

  ${props => !props.disabled && props.positive && `
    fill: ${(props.theme.percentage || light.percentage).positive};
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
  viewBox = '0 0 12 12',
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
