import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_STYLE, BORDER_WIDTH } from '@oracle/styles/units/borders';
import { DividerProps } from './index';
import { UNIT } from '@oracle/styles/units/spacing';

export const DividerContainerStyle = styled.div<DividerProps>`
  ${props => props.short && `
    width: ${21 * UNIT}px;
  `}

  ${props => !props.short && `
    width: 100%;
  `}
`;

export const DividerStyle = styled.div<DividerProps>`
  height: 1px;

  ${props => !(props.light || props.medium) && `
    background-color: ${(props.theme.monotone || dark.monotone).grey200};
  `}

  ${props => props.muted && `
    background-color: ${(props.theme.monotone || dark.monotone).grey500};
  `}

  ${props => props.light && `
    background-color: ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.medium && `
    background-color: ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => props.prominent && `
    background-color: ${(props.theme.monotone || dark.monotone).grey300};
  `}

  ${props => props.black && `
    background-color: ${(props.theme.monotone || dark.monotone).black};
  `}
`;

export const VerticalDividerStyle = styled.div<{
  right?: number;
}>`
  width: 1px;
  align-self: stretch;

  ${props => `
    border-left: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).interactive.defaultBorder};
  `}

  ${({ right }) => typeof right === 'number' && `
    position: relative;
    right: ${right}px;
  `}
`;
