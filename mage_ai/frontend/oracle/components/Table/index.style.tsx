import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const PADDING_SIZE_UNITS = 1.5;

export const TableStyle = styled.div<any>`
  overflow-y: auto;
  position: relative;
  width: 100%;
  z-index: 3;
  border-bottom-left-radius: ${BORDER_RADIUS}px;
  border-bottom-right-radius: ${BORDER_RADIUS}px;

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
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 2;

  ${props => `
    background-color: ${(props.theme.interactive || light.interactive).hoverBackground};
  `}
  ${props => !props.noBorder && `
    border: 1px solid ${(props.theme.interative || light.interactive).defaultBorder};
  `}
  ${props => props.noBorder && `
    border-radius: 0;
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

export const RowTitleStyle = styled.div<any>`
  ${props => `
    background-color: ${(props.theme.background || light.background).header};
    border: 1px solid ${(props.theme.interative || light.interactive).defaultBorder};
  `}
  ${props => !props.small && `
    padding: ${UNIT * PADDING_SIZE_UNITS}px;
  `}
  ${props => props.small && `
    padding: ${UNIT * 1.5}px;
  `}
`;

export const RowStyle = styled.div<any>`
  ${transition()}
  ${props => `
    background-color: ${(props.theme.background || light.background).page};
    border-top: none;
    border-bottom: none;
  `}
  ${props => !props.noBorder && `
    border-bottom: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
    border-left: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
    border-right: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}
  ${props => props.finalRow && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
  `}
`;

export const TextStyle = styled.div`
  p {
    cursor: pointer;
  }
`;

export const RowCellStyle = styled.div<any>`
  width: 100%;
  z-index: 0;

  ${props => !props.first && `
    border-left: 1px solid ${(props.theme.background || light.background).page};
  `}
  ${props => !props.small && `
    padding: ${UNIT * PADDING_SIZE_UNITS}px;
  `}
  ${props => props.small && `
    padding: ${UNIT * 1.5}px;
  `}
  ${props => props.vanish && `
    border: none;
    padding: 0 !important;
    width: 0% !important;
    height: 100% !important;
    background-color: ${(props.theme.background || light.background).page} !important;
  `}
`;
