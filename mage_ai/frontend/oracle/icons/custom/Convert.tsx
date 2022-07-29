import styled from 'styled-components';

import { BaseIconProps } from '../BaseIcon';
import { DEFAULT_SIZE } from '../shared/constants';

const SVGStyle = styled.svg``;

const Convert = ({
  fill,
  opacity,
  size = DEFAULT_SIZE,
  style,
  viewBox = '0 0 12 12',
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
      d="M2.5 1C1.67157 1 1 1.67157 1 2.5v.0625c0 .27614-.223858.5-.5.5s-.5-.22386-.5-.5V2.5C0 1.11929 1.11929 0 2.5 0h7C10.8807 0 12 1.11929 12 2.5v7c0 1.3807-1.1193 2.5-2.5 2.5h-7C1.11929 12 0 10.8807 0 9.5v-.0625c0-.27614.223858-.5.5-.5s.5.22386.5.5V9.5c0 .8284.67157 1.5 1.5 1.5h7c.8284 0 1.5-.6716 1.5-1.5v-7c0-.82843-.6716-1.5-1.5-1.5h-7z"
      fill="url(#paint0_linear_1332_60037)"
      fillRule="evenodd"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.05806 3.55806c.24408-.24408.6398-.24408.88388 0l2 2c.24408.24408.24408.6398 0 .88388l-2 2c-.24408.24408-.6398.24408-.88388 0-.24408-.24408-.24408-.6398 0-.88388l.93306-.93306H1C.654822 6.625.375 6.34518.375 6s.279822-.625.625-.625h5.99112l-.93306-.93306c-.24408-.24408-.24408-.6398 0-.88388z"
      fill="#fff"
    />
    <defs>
      <linearGradient id="paint0_linear_1332_60037" x1="-.618557" y1="-.000001" x2="10.5709" y2=".83113" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFCC19" />
        <stop offset=".585938" stopColor="#2ECDF7" />
        <stop offset="1" stopColor="#9E7BFF" />
      </linearGradient>
    </defs>
  </SVGStyle>
);

export default Convert;
