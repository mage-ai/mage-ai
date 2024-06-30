import React from 'react';
import styles from '@styles/scss/elements/PanelRows.module.scss';
import { LayoutGroup, motion } from 'framer-motion';
import { withStyles } from '../hocs/withStyles';

type PanelProps = {
  padding?: boolean;
  skipIndexes?: number[];
}

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

function PanelRows({ children, padding = true, skipIndexes, ...props }: { children: React.ReactNode } & PanelProps) {
  return (
    <Panel>
      <LayoutGroup>
        {React.Children.map(children, (child, index) => skipIndexes && skipIndexes?.includes(index)
          ? child
          : (
            <motion.div key={index}>
              <Row className={padding ? styles.padding : ''} first={index === 0} {...props}>
                {child}
              </Row>
            </motion.div>
          ))}
      </LayoutGroup>
    </Panel >
  );
}

export default PanelRows;
