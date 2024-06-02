import styled from 'styled-components';
import icons, { StyleProps } from '../styles/icons';

export type IconProps = {
  children?: any;
  size?: number
} & StyleProps;

export const SVGStyle = styled.svg<IconProps>``;

export const CircleStyle = styled.circle<StyleProps>`
  ${icons}
`;

export const MaskStyle = styled.mask<StyleProps>`
  ${icons}
`;

export const PathStyle = styled.path<StyleProps>`
  ${icons}
`;

export const RectStyle = styled.rect<StyleProps>`
  ${icons}
`;

export const EllipseStyle = styled.ellipse<StyleProps>`
  ${icons}
`;

const Icon = ({
  children,
  className,
  fill,
  opacity,
  size = 20,
  style,
  viewBox = '0 0 24 24',
}: IconProps) => (
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

export default Icon;
