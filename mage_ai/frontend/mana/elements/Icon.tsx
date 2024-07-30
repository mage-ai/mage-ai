import styled from 'styled-components';
import icons, { StyleProps, svg } from '../styles/icons';
import { motion } from 'framer-motion';

export type IconProps = {
  children?: any;
  size?: number;
} & StyleProps;

export const SVGStyle = styled(motion.svg)<IconProps>`
  ${svg}
`;

export const CircleStyle = styled(motion.circle)<StyleProps>`
  ${icons}
`;

export const MaskStyle = styled(motion.mask)<StyleProps>`
  ${icons}
`;

export const PathStyle = styled(motion.path)<StyleProps>`
  ${icons}
`;

export const RectStyle = styled(motion.rect)<StyleProps>`
  ${icons}
`;

export const EllipseStyle = styled(motion.ellipse)<StyleProps>`
  ${icons}
`;

const Icon = ({ children, viewBox = '0 0 24 24', ...props }: IconProps) => (
  <SVGStyle {...props} viewBox={viewBox}>
    {children}
  </SVGStyle>
);

export default Icon;
