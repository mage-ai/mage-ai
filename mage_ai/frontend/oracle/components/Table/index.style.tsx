import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const PADDING_SIZE_UNITS = 2;

export const TableStyle = styled.div<any>`
  border-radius: ${BORDER_RADIUS_LARGE}px;
  overflow-y: auto;
  position: relative;
  width: 100%;

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
    border: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
    border-top: none;
  `}


  ${props => !props.finalRow && `
    border-bottom: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}

  ${props => props.finalRow && `
    border-bottom-left-radius: ${BORDER_RADIUS_LARGE}px;
    border-bottom-right-radius: ${BORDER_RADIUS_LARGE}px;
  `}

`;

export const TextStyle = styled.p`
  cursor: pointer;
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
