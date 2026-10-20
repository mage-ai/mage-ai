import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const ContainerStyle = styled.div`
  display: flex;
  position: relative;
  width: 100%;

  ${props => `
    background-color: ${(props.theme || dark).background.dashboard};
  `}
`;

export const MenuStyle = styled.div`
  min-width: ${UNIT * 40}px;
`;

export const EditorStyle = styled.div<{
  solo?: boolean;
}>`
  padding-bottom: ${PADDING_UNITS * UNIT}px;
  padding-top: ${PADDING_UNITS * UNIT}px;
  position: relative;

  ${props => `
    background-color: ${(props.theme || dark).background.codeTextarea};
  `}

  ${props => !props.solo && `
    max-width: 100%;
    width: 100%;
  `}
`;
