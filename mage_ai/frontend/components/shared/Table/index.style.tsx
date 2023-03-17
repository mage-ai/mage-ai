import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const TableContainerStyle = styled.div<{
  includePadding?: boolean;
  maxHeight?: string;
  minHeight?: number;
  overflowVisible?: boolean;
}>`
  position: relative;
  overflow: auto;
  ${ScrollbarStyledCss}

  ${props => props.includePadding && `
    padding: ${UNIT * 2}px;
  `}

  ${props => props.maxHeight && `
    max-height: ${props.maxHeight};
  `}

  ${props => props.minHeight && `
    min-height: ${props.minHeight}px;
  `}

  ${props => props.overflowVisible && `
    overflow: visible;
  `}
`;

export const TableStyle = styled.table<{
  borderCollapseSeparate?: boolean;
  columnBorders?: boolean;
}>`
  contain: size;
  width: 100%;

  ${props => (props.columnBorders || props.borderCollapseSeparate) && `
    border-collapse: separate;
  `}
`;

export const TableRowStyle = styled.tr<{
  highlightOnHover?: boolean;
  noHover?: boolean;
}>`
  ${props => props.highlightOnHover && `
    &:hover {
      background: ${(props.theme.interactive || dark.interactive).rowHoverBackground};
    }
  `}

  ${props => !props.noHover && `
    &:hover {
      background: ${(props.theme.interactive || dark.interactive).rowHoverBackground};
      cursor: pointer;
    }
  `}
`;

type SHARED_TABLE_PROPS = {
  alignTop?: boolean;
  columnBorders?: boolean;
  compact?: boolean;
  maxWidth?: string;
  noBorder?: boolean;
  selected?: boolean;
};

const SHARED_STYLES = css<SHARED_TABLE_PROPS>`
  text-overflow: ellipsis;
  white-space: nowrap;

  ${props => !props.alignTop && `
    vertical-align: middle;
  `}

  ${props => props.alignTop && `
    vertical-align: top;
  `}

  ${props => !props.noBorder && `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.compact && `
    padding: ${UNIT / 2}px ${UNIT}px;
  `}

  ${props => !props.compact && `
    padding: ${UNIT}px ${2 * UNIT}px;
  `}

  ${props => props.maxWidth && `
    max-width: ${props.maxWidth};
  `}
`;

export const TableHeadStyle = styled.th<SHARED_TABLE_PROPS & {
  last?: boolean;
  sticky?: boolean;
}>`
  ${SHARED_STYLES}

  ${props => props.columnBorders && `
    border: 1px solid ${(props.theme.borders || dark.borders).light};
    border-right: none;
  `}

  ${props => props.columnBorders && props.last && `
    border-right: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.sticky && `
    background-color: ${(props.theme || dark).background.panel};
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
    z-index: 2;
    position: sticky;
    top: 0;

    &:first-child {
      left: 0;
      z-index: 2;
    }
  `}
`;

export const TableDataStyle = styled.td<SHARED_TABLE_PROPS & {
  rowVerticalPadding?: number;
  stickyFirstColumn?: boolean;
  last?: boolean;
  wrapColumns?: boolean;
}>`
  ${SHARED_STYLES}

  ${props => props.rowVerticalPadding && `
    padding-top: ${props.rowVerticalPadding}px;
    padding-bottom: ${props.rowVerticalPadding}px;
  `}

  ${props => props.columnBorders && `
    border-left: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.columnBorders && props.last && `
    border-right: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.stickyFirstColumn && `
    background-color: ${(props.theme || dark).background.panel};
    z-index: 1;
    position: sticky;
    left: 0;
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.interactive || dark.interactive).activeBorder};
  `}

  ${props => props.wrapColumns && `
    white-space: break-spaces;
  `}
`;
