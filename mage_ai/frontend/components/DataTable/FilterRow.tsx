import React from 'react';
import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

type FilterRowProps = {
  columnCount: number;
  columnWidth: number;
  filters: Record<number, string>;
  indexColumnWidths: number[];
  onFilterChange: (columnIndex: number, value: string) => void;
};

const FilterInputStyle = styled.input`
  ${REGULAR}
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  box-sizing: border-box;
  font-family: ${FONT_FAMILY_REGULAR};
  height: 100%;
  outline: none;
  padding: ${UNIT * 0.5}px ${UNIT}px;
  width: 100%;

  &:focus {
    border-bottom-color: ${props => (props.theme.interactive || dark.interactive).linkPrimary};
  }

  &::placeholder {
    color: ${props => (props.theme.content || dark.content).disabled};
  }
`;

function FilterRow({
  columnCount,
  columnWidth,
  filters,
  indexColumnWidths,
  onFilterChange,
}: FilterRowProps) {
  return (
    <div
      className="tr tr-filter"
      style={{
        display: 'flex',
      }}
    >
      {indexColumnWidths.map((w, idx) => (
        <div
          className="td td-index-column"
          key={`filter-index-${idx}`}
          style={{
            left: 0,
            minWidth: w,
            position: 'sticky',
            width: w,
          }}
        />
      ))}
      {Array.from({ length: columnCount }).map((_, colIdx) => (
        <div
          className="td"
          key={`filter-col-${colIdx}`}
          style={{
            minWidth: columnWidth,
            padding: 0,
            width: columnWidth,
          }}
        >
          <FilterInputStyle
            onChange={e => onFilterChange(colIdx, e.target.value)}
            placeholder="Filter..."
            value={filters[colIdx] || ''}
          />
        </div>
      ))}
    </div>
  );
}

export default FilterRow;
