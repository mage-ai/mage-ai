import React from 'react';
import styles from '@styles/scss/elements/PanelRows.module.scss';
import { LayoutGroup, motion } from 'framer-motion';
import { withStyles } from '../hocs/withStyles';

type PanelProps = {
  padding?: boolean;
  skipIndexes?: number[];
};

const Panel = withStyles(styles, {
  HTMLTag: 'div',
  classNames: ['panel'],
});

const Row = withStyles<{
  first?: boolean;
}>(styles, {
  HTMLTag: 'div',
  classNames: ['row'],
});

function PanelRows({
  children,
  padding = true,
  skipIndexes,
  ...props
}: { children: React.ReactNode } & PanelProps) {
  const arr = React.Children.map(children, (child, index) =>
    skipIndexes && skipIndexes?.includes(index) ? (
      child
    ) : (
      <Row
        {...props}
        className={[padding ? styles.padding : ''].filter(Boolean).join(' ')}
        key={index}
      >
        {child}
      </Row>
    ),
  );

  return (
    <LayoutGroup>
      <Panel>{arr}</Panel>
    </LayoutGroup>
  );
}

export default PanelRows;
