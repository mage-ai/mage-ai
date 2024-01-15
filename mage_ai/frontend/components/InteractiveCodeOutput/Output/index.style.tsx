import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { LOADING_HEIGHT } from '@oracle/components/Loading';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR } from '@oracle/styles/fonts/sizes';
import { SHARED_STYLES } from '@components/shared/Table/index.style';
import { UNIT } from '@oracle/styles/units/spacing';

const SHARED_HIDDEN_STYLES = css`
  bottom: 0;
  opacity: 0;
  position: fixed;
  right: 0;
  visibility: hidden;
  z-index: -1;
`;

export const LoadingStyle = styled.div<{
  isIdle?: boolean;
}>`
  // position: absolute;
  height: ${LOADING_HEIGHT}px;
  width: 100%;

  .inactive {
    ${SHARED_HIDDEN_STYLES}
  }

  ${props => props.isIdle && `
    border-top: 1px solid ${(props.theme || dark).borders.light};
  `}
`;

export const HTMLOutputStyle = styled.div`
  table {
    ${REGULAR}

    font-family: ${MONO_FONT_FAMILY_REGULAR};
    contain: size;
    width: 100%;
    word-break: break-all;

    ${props => `
      border-collapse: separate;
    `}
  }

  tr {
    ${props => `
      &:hover {
        background: ${(props.theme.interactive || dark.interactive).rowHoverBackground};
      }
    `}
  }

  td, th {
    text-align: center !important;
    padding: 0 8px;

    ${props => `
      color: ${(props.theme.content || dark.content).active};
    `}
  }

  th {
    ${SHARED_STYLES}

    ${props => `
      border: 1px solid ${(props.theme.borders || dark.borders).light};
      border-right: none;
    `}

    &:last-child {
      ${props => `
        border-right: 1px solid ${(props.theme.borders || dark.borders).light};
      `}
    }
  }

  td {
    ${SHARED_STYLES}

    white-space: break-spaces;

    ${props => `
      border-left: 1px solid ${(props.theme.borders || dark.borders).light};
    `}

    &:last-child {
      ${props => `
        border-right: 1px solid ${(props.theme.borders || dark.borders).light};
      `}
    }
  }
`;
