import styled from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import dark from '@oracle/styles/themes/dark';

type CircleProps = {
  borderSize?: number;
  children: any;
  color?: string;
  size: number;
};

const CircleStyle = styled.div<CircleProps>`
  border-radius: 50%;

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
        <Flex>
          {children}
        </Flex>
      </FlexContainer>
    </CircleStyle>
  );
}

export default Circle;
