import styled, { css } from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS_LARGE, BORDER_STYLE, BORDER_WIDTH } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

// TODO: Update as we find out how large the header actually is.
const HEADER_PADDING_Y_UNITS = 2;
const FOOTER_PADDING_UNITS = 2;
const PADDING_UNITS = 3;


export const SHARED_CONTENT_BACKGROUND_STYLES = css<any>`
  ${props => props.header && `
    background-color: ${(props.theme.monotone || light.monotone).row};
    border-color: ${(props.theme.interactive || light.interactive).defaultBorder};
  `}
`;

export const HEADER_STYLES = css`
  padding: ${PADDING_UNITS * UNIT}px;
  padding-bottom: ${HEADER_PADDING_Y_UNITS * UNIT}px;
  padding-top: ${HEADER_PADDING_Y_UNITS * UNIT}px;
`;

export const PanelStyle = styled.div`
  border-radius: ${BORDER_RADIUS_LARGE}px;
  overflow: hidden;
  width: 100%;

  ${props => `
    background-color: ${(props.theme.monotone || light.monotone).row};
  `}

  ${SHARED_CONTENT_BACKGROUND_STYLES}
`;

export const HeaderStyle = styled.div<any>`
  ${props => props.header && `
  background-color: ${(props.theme.brand || light.background).header};
  `}


  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${HEADER_STYLES}
`;

export const ContentStyle = styled.div<any>`
  overflow-y: auto;
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => props.height && `
    height: ${props.height}px;
  `}
`;

export const FooterStyle = styled.div`
  border-style: ${BORDER_STYLE};
  border-top-width: ${BORDER_WIDTH}px;
  padding: ${FOOTER_PADDING_UNITS * UNIT}px;

  ${SHARED_CONTENT_BACKGROUND_STYLES}
`;
