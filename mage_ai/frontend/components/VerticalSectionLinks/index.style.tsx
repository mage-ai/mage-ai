import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const CHART_HEIGHT_DEFAULT = UNIT * 40;

export const SectionTitleStyle = styled.div`
  padding: ${UNIT * 1}px ${UNIT * 2.5}px;
`;

export const ItemStyle = styled.div<{
  selected: boolean;
}>`
  ${transition()}

  padding: ${UNIT * 1.5}px ${UNIT * 2.5}px;

  ${props => !props.selected && `
    &:hover {
      background-color: ${(props.theme.background || dark.background).codeArea};
    }
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;
