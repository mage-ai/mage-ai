import styled from 'styled-components';
import icons, { StyleProps, svg } from '../styles/icons';

export type IconProps = {
  children?: any;
  size?: number;
} & StyleProps;

export const SVGStyle = styled.svg<IconProps>`
  ${svg}
`;

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

const Icon = ({ children, viewBox = '0 0 24 24', ...props }: IconProps) => (
  <SVGStyle {...props} viewBox={viewBox}>
    {children}
  </SVGStyle>
);

export default Icon;
