import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const ContainerStyle = styled.div`
  display: flex;
  flex: 1;
  overflow: auto;
  padding: ${UNIT}px;
  width: 100%;
`;

export const NodeStyle = styled.div<{
  backgroundColor?: string;
  disabled: boolean;
  selected: boolean;
}>`
  border: 2px solid transparent;
  border-radius: ${BORDER_RADIUS_SMALL}px;
  margin-left: ${UNIT}px;
  margin-right: ${UNIT}px;

  ${props => props.selected && `
    border-color: ${(props.theme.content || dark.content).active};
  `}

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}

  ${props => props.disabled && `
    opacity: 0.5;

    &:hover {
      cursor: not-allowed;
    }
  `}
`;
