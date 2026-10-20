import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { HEADER_HEIGHT } from '@components/constants';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';


export const HeaderStyle = styled.div`
  border-bottom: 1px solid #1B1C20;
  height: ${HEADER_HEIGHT}px;

  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const TerminalStyle = styled.div`
  height: calc(75vh - ${HEADER_HEIGHT}px);
  position: relative;
`;

export const PanelStyle = styled.div`
	// ${ScrollbarStyledCss}

	height: 75vh;
	min-height: 300px;
	width: 75vw;
	backgroundColor: #232429;
	// overflow-y: auto;
	border-radius: ${BORDER_RADIUS}px;

	${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;

export const OutputStyle = styled.div<{
  noScrollbarTrackBackground?: boolean;	
}>`
	${ScrollbarStyledCss}

	padding: ${2 * UNIT}px ;
  height: calc(75vh - ${HEADER_HEIGHT}px);
	overflow-y: auto;
`;
