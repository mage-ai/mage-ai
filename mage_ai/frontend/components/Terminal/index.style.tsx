import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

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

export const ContainerStyle = styled.div<{
  width?: number;
}>`
  ${SHARED_STYLES}
  ${ScrollbarStyledCss}

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

const TerminalCursorStyleCss = css<{
  focusBeginning?: boolean;
  focused?: boolean;
}>`
  @keyframes cursor-blink {
    0% {
      opacity: 0;
    }
  }

  ::before {
    ${props => props.focusBeginning && `
      position: absolute;
      background-color: ${(props.theme.accent || dark.accent).warning};
      content: "";
      display: inline-block;
      height: ${ROW_HEIGHT}px;
      width: ${UNIT}px;
      opacity: 0.3;
    `}
  }

  ::after {
    ${props => props.focused && `
      background-color: ${(props.theme.accent || dark.accent).warning};
      content: "";
      display: inline-block;
      height: ${ROW_HEIGHT}px;
      width: ${UNIT}px;
      opacity: 0.3;
    `}
  }
`;

export const InputStyle = styled.div<{
  focused?: boolean;
}>`
  align-items: center;
  display: flex;
  gap: 2px;

  ${TerminalCursorStyleCss}
`;

export const CharacterStyle = styled.span<{
  focusBeginning?: boolean;
  focused?: boolean;
}>`
  ${TerminalCursorStyleCss}

  ::after {
    ${props => props.focused && `
      position: absolute;
    `}
  }
`;
