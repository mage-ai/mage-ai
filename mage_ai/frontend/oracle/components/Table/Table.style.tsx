import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS_LARGE, BORDER_STYLE, BORDER_WIDTH } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const PADDING_SIZE_UNITS = 2;

export const TableStyle = styled.div<any>`
  border-radius: ${BORDER_RADIUS_LARGE}px;
  position: relative;
  width: 100%;
  display: inline-block;
  height: 100%;
  max-height: 100vh;
  white-space: nowrap;
  overflow: auto;


  ${props => `
    background-color: ${(props.theme.background || light.background).page};
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}
  ${props => props.flex && `
    flex: 1;
  `}
`;

export const ColumnHeaderRowStyle = styled.div<any>`
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 2;

  ${props => `
    background-color: ${(props.theme.interactive || light.interactive).hoverBackground};
    border: 1px solid ${(props.theme.interative || light.interactive).defaultBorder};
  `}
`;

export const ColumnHeaderCellStyle = styled.div<any>`
  ${props => !props.small && `
    padding: ${UNIT * PADDING_SIZE_UNITS}px;
  `}

  ${props => props.small && `
    padding: ${UNIT * 1.5}px;
  `}
`;


export const RowCellStyle = styled.div<any>`
  width: 100%;

  ${props => !props.first && `
    border-left: 1px solid ${(props.theme.background || light.background).page};
  `}

  ${props => !props.small && `
    padding: ${UNIT * PADDING_SIZE_UNITS}px;
  `}

  ${props => props.small && `
    padding: ${UNIT * 1.5}px;
  `}
`;

export const CellStyled = styled.div`
  ${({ onClick }) => onClick && 'cursor: pointer;'}
  flex-shrink: 0;
  margin: 0;
  position: relative;
  z-index: 0;
  white-space: nowrap;
  * { color: var(--cell-text-color) }
  // perf: add padding to cell instead of rendering <spacing> element

  padding: ${UNIT * 2}px;

  border-bottom: ${BORDER_WIDTH}px ${BORDER_STYLE} ;
  border-right: ${BORDER_WIDTH}px ${BORDER_STYLE} ;
`;
