import styled from 'styled-components';

export function childClassName(uuid: string): string {
  return `${uuid}-child`;
}

export function itemsClassName(uuid: string): string {
  return `${uuid}-child-items`;
}

export type FolderStyledProps = {
  uuid: string;
};

export const FolderStyled = styled.div<FolderStyledProps>`
  ${({ theme, uuid }) => `
    .${childClassName(uuid)} {
      &:hover {
        background-color: ${theme.colors.backgrounds.button.base.hover};
        cursor: pointer;

        -moz-user-select: none; /* Firefox */
        -ms-user-select: none; /* Internet Explorer/Edge */
        -webkit-user-select: none; /* Safari */
        user-select: none; /* Standard property */
      }
    }

    .${itemsClassName(uuid)} {
      &.collapsed {
        display: none;
        height: 0;
        visibility: hidden;
      }

      &.expanded {
        visibility: visible;
      }
    }
  `}
`;

export const NameStyled = styled.div`
  padding-bottom: ${({ theme }) => theme.padding.xs}px;
  padding-top: ${({ theme }) => theme.padding.xs}px;
`;

export const ColumnGapStyled = styled.div`
  height: 100%;
  padding-left: ${({ theme }) => theme.icons.size.sm / 2}px;
  padding-right: ${({ theme }) => theme.grid.gutter.width.sm}px;
  width: ${({ theme }) => theme.icons.size.sm / 2}px;
`;

export const LineStyled = styled.div`
  background: ${({ theme }) => theme.borders.color.base.hover};
  height: inherit;
  width: 1px;
`;
