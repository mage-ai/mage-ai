import React, { useState } from 'react';
import Flex from '@oracle/components/Flex';
import Link from '@oracle/elements/Link';
import Text from '@oracle/elements/Text';
import { ArrowDown, ArrowRight } from '@oracle/icons';
import { RowCellStyle } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import ProgressBar from '../ProgressBar';
import FlexContainer from '../FlexContainer';

type CellProps = {
  cellIndex: number;
  danger?: boolean;
  flex: number;
  render?: any;
  rowGroupIndex: number;
  rowIndex: number;
  selected: boolean;
  small: boolean;
  showBackground?: boolean;
  showProgress?: boolean;
  textColor?: string;
  value: any;
  vanish?: boolean;
};

function Cell({
  cellIndex,
  danger,
  flex,
  render,
  rowGroupIndex,
  rowIndex,
  selected,
  small,
  showBackground,
  showProgress,
  textColor,
  value,
  vanish,
}: CellProps) {
  const [collapsed, setCollapsed] = useState(false);
  let cellEl;

  const isArray = Array.isArray(value);

  if (render) {
    cellEl = render(value);
  } else if (typeof value === 'function') {
    // @ts-ignore
    cellEl = value({
      selected,
    });
  } else if (isArray) {
    cellEl = (
      <Flex
        alignItems="start"
        flexDirection="row"
        justifyContent="space-between"
      >
        <Text
          small={small}
          textOverflow
          title={value[0]}
        >
          {collapsed && (
            <>
              {`${value[0]} & ${value.length - 1} more`}
            </>
          )}
          {!collapsed && (
            <>
              {value.map(v => (
                <div key={v}>
                  {v}
                </div>
              ))}
            </>
          )}
        </Text>
        <Link
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed && (
            <ArrowDown muted size={UNIT * 2} />
          )}
          {!collapsed && (
            <ArrowRight muted size={UNIT * 2} />
          )}
        </Link>
      </Flex>
    );
  } else if (showProgress) {
    cellEl = (
      <FlexContainer alignItems={'center'} fullHeight fullWidth>
        <ProgressBar danger={value < 80} progress={value} />
      </FlexContainer>
    );
  }
  else {
    cellEl = (
      <Text
        bold={danger}
        danger={danger}
        small={small}
        textOverflow
        title={value}
      >
        {value}
      </Text>
    );
  }

  return (
    <Flex
      flex={flex}
      key={`cell-${rowGroupIndex}-${rowIndex}-${cellIndex}-${value}`}
      textOverflow
    >
      <RowCellStyle
        first={cellIndex === 0}
        showBackground={showBackground}
        small={small}
        textColor={textColor}
        vanish={vanish}
      >
        { !vanish && <>{cellEl} </>
        }
      </RowCellStyle>
    </Flex>
  );
}

export default Cell;
