import styled from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

type CircleProps = {
  borderColor?: string;
  borderOnly?: boolean;
  borderSize?: number;
  children?: any;
  color?: string;
  danger?: boolean;
  default?: boolean;
  muted?: boolean;
  primary?: boolean;
  primaryLight?: boolean;
  size: number;
  square?: boolean;
  success?: boolean;
  warning?: boolean;
};

const CircleStyle = styled.div<CircleProps>`
  ${props => !props.square && `
    border-radius: 50%;
  `}

  ${props => props.square && `
    border-radius: ${props.size >= UNIT * 2 ? BORDER_RADIUS_SMALL : 2}px;
  `}

  ${props => !props.color && !(props.borderSize || props.borderColor) && `
    background-color: ${(props.theme.content || dark.content).muted};
  `}

  ${props => !props.color && props.primary && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
  `}

  ${props => !props.color && props.primaryLight && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimaryLight};
  `}

  ${props => props.success && !props.borderSize && `
    background-color: ${(props.theme.status || dark.status).positive};
  `}

  ${props => props.warning && !props.borderSize && `
    background-color: ${(props.theme.accent || dark.accent).warning};
  `}

  ${props => props.success && props.borderSize && `
    border-color: ${(props.theme.status || dark.status).positive} !important;
  `}

  ${props => props.warning && props.borderSize && `
    border-color: ${(props.theme.accent || dark.accent).warning} !important;
  `}

  ${props => props.borderSize && `
    border-style: solid;
    border-width: ${props.borderSize}px;
  `}

  ${props => props.color && props.borderOnly && `
    background-color: transparent !important;
    border: 1px solid ${props.color};
  `}

  ${props => props.danger && props.borderOnly && `
    background-color: transparent !important;
    border: 1px solid ${(props.theme.borders || dark.borders).danger};
  `}

  ${props => props.warning && props.borderOnly && `
    background-color: transparent !important;
    border: 1px solid ${(props.theme.accent || dark.accent).warning};
  `}

  ${props => props.success && props.borderOnly && `
    background-color: transparent !important;
    border: 1px solid ${(props.theme.background || dark.background).success};
  `}

  ${props => (props.borderSize || props.borderColor) && `
    border: ${props.borderSize || 1}px solid ${props.borderColor || (props.theme.content || dark.content).active};
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

  ${props => props.muted && `
    border-color: ${(props.theme.content || dark.content).muted};
  `}

  ${props => props.default && `
    border-color: ${(props.theme.monotone || dark.monotone).gray};
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
