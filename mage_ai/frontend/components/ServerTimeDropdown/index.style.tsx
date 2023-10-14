import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';

const SHARED_CELL_PADDING = '12px 20px';
const SHARED_GAP = '1px';

export const DropdownContainerStyle = styled.div<{
  top?: number;
}>`
  position: absolute;
  top: ${props => props.top || 0};
  right: 0;
  width: 360px;

  display: flex;
  flex-direction: column;
  gap: ${SHARED_GAP};

  overflow: hidden;
  background-color: ${props => (props.theme.borders || dark.borders).darkLight};
  border-radius: 8px;
  border: 1px solid ${props => (props.theme.borders || dark.borders).darkLight};
`;

export const DropdownHeaderStyle = styled.div`
  padding: ${SHARED_CELL_PADDING};

  background-color: ${props => (props.theme.background || dark.background).panel};
`;

export const TimeListContainerStyle = styled.div`
  height: 160px;

  display: flex;
  gap: ${SHARED_GAP};
`;

export const TimeColumnStyle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: ${SHARED_GAP};
`;

export const DropdownCellStyle = styled.div<{
  flexDirection?: string;
  flexGrow?: number;
}>`
  width: 100%;
  padding: ${SHARED_CELL_PADDING};

  display: flex;
  flex-direction: ${props => props.flexDirection || 'unset'};
  flex-grow: ${props => props.flexGrow || 'unset'};
  justify-content: center;
  align-items: center;
  
  background-color: ${props => (props.theme.background || dark.background).dashboard};
`;

export const ToggleGroupStyle = styled.div`
  display: flex;
  flex-direction: column;
`;

export const ToggleDropdownCellStyle = styled(DropdownCellStyle)`
  justify-content: flex-start;
  gap: 12px;
`;
