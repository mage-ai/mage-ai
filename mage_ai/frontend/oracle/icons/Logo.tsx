import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import {
  BLACK,
  WHITE,
  SHADE,
} from '@oracle/styles/colors/main';

export type LogoProps = {
  earth?: boolean;
  fire?: boolean;
  height?: number;
  inverted?: boolean;
  slash?: boolean;
  water?: boolean;
  width?: number;
  wind?: boolean;
};

const SVGStyle = styled.svg``;

const PathStyle = styled.path<LogoProps>`
  ${props => !props.slash && !props.inverted && `
    fill: ${(props.theme.logo || dark.logo).color};
  `}

  ${props => !props.slash && props.inverted && `
    fill: ${BLACK};
  `}

  ${props => props.slash && `
    fill: ${SHADE};
  `}

  ${props => props.earth && !props.slash && `
    fill: ${(props.theme.brand || dark.brand).earth400};
  `}

  ${props => props.earth && props.slash && `
    fill: ${(props.theme.brand || dark.brand).earth400Transparent};
  `}

  ${props => props.fire && !props.slash && `
    fill: ${(props.theme.brand || dark.brand).fire400};
  `}

  ${props => props.fire && props.slash && `
    fill: ${(props.theme.brand || dark.brand).fire400Transparent};
  `}

  ${props => props.water && !props.slash && `
    fill: ${(props.theme.brand || dark.brand).water400};
  `}

  ${props => props.water && props.slash && `
    fill: ${(props.theme.brand || dark.brand).water400Transparent};
  `}

  ${props => props.wind && !props.slash && `
    fill: ${(props.theme.brand || dark.brand).wind400};
  `}

  ${props => props.wind && props.slash && `
    fill: ${(props.theme.brand || dark.brand).wind400Transparent};
  `}
`;

const HEIGHT = 142;
const WIDTH = 186;
const RATIO = WIDTH / HEIGHT;

const Logo = ({
  height,
  width,
  ...props
}: LogoProps) => {
  const h = height || (width ? (width * (1 / RATIO)) : HEIGHT);
  const w = width || (height ? (height * (RATIO)) : WIDTH);

  return (
    <SVGStyle
      height={h}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={w}
    >
      <PathStyle
        d="M112.1 141.3H73L146 0H185.1L112.1 141.3Z"
        slash
        {...props}
      />
      <PathStyle
        d="M185 0H146V141.3H185V0Z"
        {...props}
      />
      <PathStyle
        d="M39.1 141.3H0L73 0H112.1L39.1 141.3Z"
        {...props}
      />
      <PathStyle
        d="M112 0H73V141.3H112V0Z"
        {...props}
      />
    </SVGStyle>
  );
};

export default Logo;
