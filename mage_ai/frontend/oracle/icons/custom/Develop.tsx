import styled from 'styled-components';

import { BaseIconProps } from '../BaseIcon';
import { DEFAULT_SIZE } from '../shared/constants';

const SVGStyle = styled.svg``;

const Develop = ({
  fill,
  opacity,
  size = DEFAULT_SIZE,
  style,
  viewBox = '0 0 16 16',
}: BaseIconProps) => (
  <SVGStyle
    fill={fill}
    height={size}
    opacity={opacity}
    style={style}
    viewBox={viewBox}
    width={size}
  >
    <path
      clipRule="evenodd"
      d="M1 1H5V5H1V1ZM6 6V10H10V6H6ZM11 10V5H6V0H0V5V6V10V11V16H5H6H10H11H16V10H11ZM11 15H15V11H11V15ZM10 15V11H6V15H10ZM5 6V10H1V6H5ZM1 11H5V15H1V11Z"
      fill={fill || 'url(#paint0_linear_1930_66663)'}
      fillRule="evenodd"
    />
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="paint0_linear_1930_66663"
        x1="-0.824742"
        x2="14.0945"
        y1="-1.62953e-06"
        y2="1.10817"
      >
        <stop stopColor="#FFCC19" />
        <stop offset=".585938" stopColor="#2ECDF7" />
        <stop offset="1" stopColor="#9E7BFF" />
      </linearGradient>
    </defs>
  </SVGStyle>
);

export default Develop;
