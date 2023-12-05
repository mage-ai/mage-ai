import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { BorderColorShareProps, BORDER_COLOR_SHARED_STYLES } from '@components/CodeBlock/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { transition } from '@oracle/styles/mixins';

export const MODAL_PADDING = 8 * UNIT;

export const ContainerStyle = styled.div<{
  borderColor?: string;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-radius: ${BORDER_RADIUS}px;
  position: relative;
  border-style: solid;
  border-width: 1px;
  overflow: hidden;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;

export const HeadlineStyle = styled.div`
  ${props => `
    background-color: ${(props.theme.background || dark.background).chartBlock};
  `}
`;

export const DottedLineStyle = styled.div`
  ${props => `
    border: 1px dashed ${(props.theme.borders || dark.borders).light};
  `}
`;

export const LayoutItemStyle = styled.div<{
  disableDrag?: boolean;
}>`
  ${props => !props.disableDrag && `
    &:hover {
      cursor: move;
    }
  `}
`;
