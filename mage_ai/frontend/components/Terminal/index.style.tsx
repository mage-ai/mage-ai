import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const ROW_HEIGHT = 20;

const SHARED_STYLES = css<{
  width?: number;
}>`
  ${props => !props.width && `
    width: 100%;
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}
`;

export const ContainerStyle = styled.div`
  ${SHARED_STYLES}

  height: 100%;
  overflow: auto;
  position: absolute;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;

export const InnerStyle = styled.div`
  ${SHARED_STYLES}

  padding: ${PADDING_UNITS * UNIT}px;
`;

export const LineStyle = styled.div`
  height: ${ROW_HEIGHT}px;
`;

const BlinkingCursorStyleCss = css<{
  focused: boolean;
}>`
  @keyframes cursor-blink {
    0% {
      opacity: 0;
    }
  }

  ::after {
    ${props => props.focused && `
      animation: cursor-blink 1.1s steps(2) infinite;
      background-color: ${(props.theme.accent || dark.accent).warning};
      content: "";
      display: inline-block;
      height: ${ROW_HEIGHT}px;
      width: ${UNIT * 0.25}px;
    `}
  }
`;

export const InputStyle = styled.div<{
  focused: boolean;
}>`
  align-items: center;
  display: flex;
  gap: 2px;
  height: ${ROW_HEIGHT}px;

  ${BlinkingCursorStyleCss}
`;

export const CharacterStyle = styled.span<{
  focused: boolean;
}>`
  ${BlinkingCursorStyleCss}

  ::after {
    ${props => props.focused && `
      position: absolute;
    `}
  }
`;
