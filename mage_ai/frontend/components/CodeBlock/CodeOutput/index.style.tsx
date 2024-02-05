import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import {
  BORDER_COLOR_SHARED_STYLES,
  BorderColorShareProps,
  LEFT_PADDING,
} from '../index.style';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING, PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SHARED_STYLES } from '@oracle/elements/Text';

export const ContainerStyle = styled.div<{
  addBottomPadding?: boolean;
  executedAndIdle?: boolean;
  showBorderTop?: boolean;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-left-style: solid;
  border-left-width: 2px;
  border-right-style: solid;
  border-right-width: 2px;
  overflow: hidden;

  ${props => props.addBottomPadding && `
    padding-bottom: ${2 * PADDING}px;
  `}

  ${props => `
    background-color: ${(props.theme.background || dark.background).table};
  `}

  ${props => !props.executedAndIdle && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
    border-bottom-style: solid;
    border-bottom-width: 2px;
  `}

  ${props => props.showBorderTop && `
    border-top-left-radius: ${BORDER_RADIUS}px;
    border-top-right-radius: ${BORDER_RADIUS}px;
    border-top-style: solid;
    border-top-width: 2px;
  `}
`;

export const OutputRowStyle = styled.div<{
  contained?: boolean;
  first?: boolean;
  last?: boolean;
  normalPadding?: boolean;
}>`
  ${props => props.first && `
    padding-top: ${UNIT * PADDING_UNITS}px;
  `}

  ${props => props.last && `
    padding-bottom: ${UNIT * PADDING_UNITS}px;
  `}

  ${props => props.contained && !props.normalPadding && `
    padding-left: ${LEFT_PADDING}px;
    padding-right: ${UNIT * PADDING_UNITS}px;
  `}

  ${props => props.contained && props.normalPadding && `
    padding-left: ${UNIT * PADDING_UNITS}px;
    padding-right: ${UNIT * PADDING_UNITS}px;
  `}
`;

export const HTMLOutputStyle = styled.div<any>`
  ${SHARED_STYLES}

  table {
    ${BORDER_COLOR_SHARED_STYLES}
    border-left-style: solid;
    border-left-width: 2px;
    border-right-style: solid;
    border-right-width: 2px;
  }

  td, th {
    padding: 0 8px;
  }
  a {

    ${props => `
      color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    `}
  }
`;

export const ExtraInfoStyle = styled.div<BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-bottom-left-radius: ${BORDER_RADIUS}px;
  border-bottom-right-radius: ${BORDER_RADIUS}px;
  border-bottom-style: solid;
  border-bottom-width: 2px;
  border-left-style: solid;
  border-left-width: 2px;
  border-right-style: solid;
  border-right-width: 2px;

  ${props => `
    background-color: ${(props.theme.borders || dark.borders).light};
  `}
`;

export const ExtraInfoContentStyle = styled.div`
  padding-bottom: ${UNIT}px;
  padding-left: ${LEFT_PADDING}px;
  padding-right: ${UNIT * PADDING_UNITS}px;
  padding-top: ${UNIT}px;
`;

export const ExtraInfoBorderStyle = styled.div`
  height: 1px;
  width: 100%;

  ${props => `
    border-top: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export const MultiOutputStyle = styled.div`
  .inactive {
    display: none;
  }
`;
