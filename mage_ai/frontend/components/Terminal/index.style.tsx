import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const ROW_HEIGHT = 20;

export const ContainerStyle = styled.div`
  height: 100%;
  overflow: auto;
  position: absolute;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => !props.width && `
    width: 100%;
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}
`;

export const InnerStyle = styled.div`
  padding: ${PADDING_UNITS * UNIT}px;
`;

export const LineStyle = styled.div`
  height: ${ROW_HEIGHT}px;
`;

export const InputStyle = styled.div`
  @keyframes cursor-blink {
    0% {
      opacity: 0;
    }
  }

  align-items: center;
  display: flex;
  gap: 2px;
  height: ${ROW_HEIGHT}px;

  ::after {
    animation: cursor-blink 1.5s steps(2) infinite;
    content: "";
    display: inline-block;
    height: ${ROW_HEIGHT}px;
    width: ${UNIT * 0.75}px;

    ${props => `
      background-color: ${(props.theme.accent || dark.accent).warning};
    `}
  }
`;
