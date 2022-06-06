import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { UNIT, PADDING_UNITS } from '@oracle/styles/units/spacing';

export const TableStyle = styled.div<any>`
  border-radius: ${BORDER_RADIUS_LARGE}px;
  max-width: 100vw;
  overflow: auto;
  position: relative;

  ${props => `
    border: 1px solid ${(props.theme.monotone || light.monotone).grey200};
  `}

  ${props => props.table &&`
    background-color: ${(props.theme.background || light.background).page};
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${props => props.flex && `
    flex: 1;
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => !props.width && `
    width: 100%;
  `}
`;

export const TableHeadStyle = styled.thead`
  th {
    padding: ${UNIT * 0.5}px;

    ${props => `
      border-bottom: 1px solid ${(props.theme.monotone || light.monotone).grey200};
      background-color: ${(props.theme.monotone || light.monotone).grey100};
    `}
  }

  th:not(:first-child) {
    ${props => `
      border-left: 1px solid ${(props.theme.monotone || light.monotone).grey200};
    `}
  }
`;

export const TableBodyStyle = styled.tbody`
  td {
    padding: ${UNIT * 0.5}px;
  }
`;

type TableRowProps = {
  showBackground?: boolean;
};

export const TaleRowStyle = styled.tr<TableRowProps>`
  ${props => props.showBackground && `
    background-color: ${(props.theme.monotone || light.monotone).grey100};
  `}
`;

// TODO: Update these hardcoded values
export const RowCellStyle = styled.div<any>`
  flex-shrink: 0;
  max-height: 80px;

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
