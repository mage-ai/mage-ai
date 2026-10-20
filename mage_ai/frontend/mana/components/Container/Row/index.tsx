import React, { forwardRef } from 'react';
import { Row as RowGrid, RowProps as RowGridProps } from 'react-grid-system';

import useWithDisplay, { WithDisplayProps } from '../../../hooks/useWithDisplay';
import { GRID_ROW_COL_CLASS } from '../Col';
import { RowStyled } from './index.style';
import { GridGutterWidthEnum } from '@mana/themes/grid';

type RowProps = {
  useClassNameGutter?: boolean;
  verticalGutter?: boolean | number;
} & RowGridProps &
  WithDisplayProps;

const RowComponent = forwardRef<any, RowProps>(
  ({ children, nogutter, useClassNameGutter, verticalGutter, ...props }, ref) => {
    const paddingHorizontal = (props?.gutterWidth || GridGutterWidthEnum.BASE) / 2;
    const paddingVertical = !!verticalGutter
      ? typeof verticalGutter === 'boolean'
        ? paddingHorizontal
        : verticalGutter
      : undefined;

    return (
      <RowStyled
        horizontalGutter={useClassNameGutter && paddingHorizontal ? paddingHorizontal : undefined}
        verticalGutter={paddingVertical}
      >
        <RowGrid {...props} nogutter={nogutter || !!useClassNameGutter} ref={ref}>
          {React.Children.map(children, child => {
            if (!React.isValidElement(child)) {
              return child;
            }

            return React.cloneElement(child, {
              // @ts-ignore
              className: [
                child?.props?.className || '',
                useClassNameGutter ? GRID_ROW_COL_CLASS : '',
              ].join(' '),
              style: {
                ...child?.props?.style,
                ...(paddingVertical && !useClassNameGutter
                  ? {
                      paddingBottom: paddingVertical,
                      paddingTop: paddingVertical,
                    }
                  : {}),
              },
            });
          })}
        </RowGrid>
      </RowStyled>
    );
  },
);

const RowWithDisplay = useWithDisplay(RowComponent);

export default RowWithDisplay;
