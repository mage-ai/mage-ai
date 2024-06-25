import React from 'react';
import styles from '@styles/scss/elements/PanelRows.module.scss';
import { LayoutGroup, motion } from 'framer-motion';
import { withStyles } from '../hocs/withStyles';

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

function PanelRows({ children, ...props }: { children: React.ReactNode }) {
  return (
    <Panel>
      <LayoutGroup>
        {React.Children.map(children, (child, index) => (
          <motion.div key={index}>
            <Row first={index === 0} {...props}>
              {child}
            </Row>
          </motion.div>
        ))}
      </LayoutGroup>
    </Panel>
  );
}

export default PanelRows;
