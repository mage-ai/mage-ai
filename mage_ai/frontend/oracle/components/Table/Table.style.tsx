import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { UNIT, PADDING_UNITS } from '@oracle/styles/units/spacing';

export const TableStyle = styled.div<any>`
  max-height: 50vh;
  max-width: 100vw;
  overflow: auto;
  position: relative;

  ${props => props && `
    border-collapse: collapse;
  `}
  ${props => props.table && `
    background-color: ${(props.theme.background || light.background).page};
  `}
  ${props => props.height && `
    height: ${props.height}px;
  `}
  ${props => props.flex && `
    flex: 1;
  `}
`;


// TODO: Update these hardcoded values
export const RowCellStyle = styled.div<any>`
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

  ${props => !props.width && `
    max-width: ${props.width}px;
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
