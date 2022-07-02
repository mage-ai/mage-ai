import styled from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';

type CircleProps = {
  borderSize?: number;
  children?: any;
  color?: string;
  danger?: boolean;
  size: number;
  square?: boolean;
};

const CircleStyle = styled.div<CircleProps>`
  ${props => !props.square && `
    border-radius: 50%;
  `}

  ${props => props.square && `
    border-radius: ${BORDER_RADIUS_SMALL}px;
  `}

  ${props => !props.color && !props.borderSize && `
    background-color: ${(props.theme.content || dark.content).muted};
  `}

  ${props => props.borderSize && `
    border: ${props.borderSize}px solid ${(props.theme.content || dark.content).active};
  `}

  ${props => props.color && `
    background-color: ${props.color};
  `}

  ${props => props.size && `
    height: ${props.size}px;
    width: ${props.size}px;
  `}

  ${props => props.danger && `
    background-color: ${(props.theme.borders || dark.borders).danger};
  `}
`;

function Circle({ children, ...props }: CircleProps) {
  return (
    <CircleStyle {...props}>
      <FlexContainer
        alignItems="center"
        fullHeight
        fullWidth
        justifyContent="center"
      >
        {children && (
          <Flex>
            {children}
          </Flex>
        )}
      </FlexContainer>
    </CircleStyle>
  );
}

export default Circle;
