import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { ThemeType } from '@oracle/styles/themes/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const CHART_HEIGHT_DEFAULT = UNIT * 40;

export const ChartBlockStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  margin-left: ${UNIT * 0.5}px;
  margin-right: ${UNIT * 0.5}px;
  margin-top: ${UNIT * 1}px;
  // overflow: hidden;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeArea};
  `}
`;

export const ConfigurationOptionsStyle = styled.div`
  flex: 4;
  padding-left: ${UNIT * 1}px;
  padding-right: ${UNIT * 1}px;

  // ${props => `
  //   border-left: 1px solid ${(props.theme.borders || dark.borders).medium};
  // `}
`;

export const CodeStyle = styled.div`
  // border-radius: ${BORDER_RADIUS_SMALL}px;
  padding-top: ${UNIT / 2}px;
  // overflow: hidden;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;

export const CodeHelperStyle = styled.div`
  margin-bottom: ${PADDING_UNITS * UNIT}px;
  padding-bottom: ${UNIT}px;
  padding-left: ${UNIT}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;
