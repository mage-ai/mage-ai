import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ThemeType } from '@oracle/styles/themes/constants';
import { transition } from '@oracle/styles/mixins';

export const ChartBlockStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  margin-left: ${UNIT * PADDING_UNITS}px;
  margin-right: ${UNIT * PADDING_UNITS}px;
  margin-top: ${UNIT * PADDING_UNITS}px;
  padding: ${UNIT * PADDING_UNITS}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).chartBlock};
  `}
`;

export const ConfigurationOptionsStyle = styled.div`
  padding-bottom: ${PADDING_UNITS * UNIT}px;
  padding-left: ${PADDING_UNITS * UNIT}px;

  ${props => `
    border-left: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export const CodeContainerStyle = styled.div`
  padding-top: ${PADDING_UNITS * UNIT}px;

  ${props => `
    border-top: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export const CodeStyle = styled.div`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  padding-top: ${UNIT / 2}px;
  overflow: hidden;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;
