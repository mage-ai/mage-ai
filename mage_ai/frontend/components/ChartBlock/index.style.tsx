import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ThemeType } from '@oracle/styles/themes/constants';
import { transition } from '@oracle/styles/mixins';

export const ChartBlockStyle = styled.div`
  margin-left: ${UNIT * PADDING_UNITS}px;
  margin-right: ${UNIT * PADDING_UNITS}px;
  margin-top: ${UNIT * PADDING_UNITS}px;
  padding: ${UNIT * PADDING_UNITS}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).chartBlock};
  `}
`;
