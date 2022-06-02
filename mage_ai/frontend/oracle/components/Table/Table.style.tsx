import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { UNIT, PADDING_UNITS } from '@oracle/styles/units/spacing';

export const TableStyle = styled.div<any>`
  position: relative;
  width: 100%;
  max-width: 100vw;
  height: 100%;
  max-height: 100vh;
  overflow: auto;
  ${props => props.table &&`
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
  position: relative;
  z-index: 2;
  min-width: 44px;
  min-height: 20px;
  ${props => `
    background-color: ${(props.theme.interactive || light.interactive).hoverBackground};
    border: 1px solid ${(props.theme.interative || light.interactive).defaultBorder};
  `}
`;

export const ColumnHeaderCellStyle = styled.div<any>`
  max-width: 44px;
  max-height: 44px;
  ${props => !props.small && `
    padding: ${UNIT * PADDING_UNITS}px;
  `}
  ${props => props.small && `
    padding: ${UNIT * 1.5}px;
  `}
`;

// TODO: Update these hardcoded values
export const RowCellStyle = styled.div<any>`
  min-width: 250px;
  max-height: 80px;
  flex-shrink: 0;
  ${props => !props.first && `
    border-left: 1px solid ${(props.theme.background || light.background).page};
  `}
  ${props => !props.small && `
    padding: ${UNIT * PADDING_UNITS}px;
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
  z-index: 3;
  white-space: nowrap;
  * { color: var(--cell-text-color) }
  // perf: add padding to cell instead of rendering <spacing> element
  padding: ${UNIT * 2}px;
`;