import React, { forwardRef } from 'react';

type RowProps = {
  children: React.ReactNode;
  alignContent?: string;
  alignItems?: string;
  autoColumns?: string;
  autoFlow?: string;
  autoRows?: string;
  columnGap?: number;
  compact?: boolean;
  height?: number | string;
  justifyContent?: string;
  justifyItems?: string;
  overflow?: string;
  pad?: boolean;
  row?: number | string;
  rowGap?: number;
  section?: boolean;
  templateColumns?: string;
  templateRows?: string;
  width?: number | string;
};

function Row({ children, ...props }: RowProps, ref: React.Ref<HTMLDivElement>) {
  return (
    <div {...props} className={styles.row} ref={ref}>
      {children}
    </div>
  );
}

export default forwardRef(Row);
