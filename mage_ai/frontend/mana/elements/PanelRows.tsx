import React from 'react';
import styles from '@styles/scss/elements/PanelRows.module.scss';
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
      {React.Children.map(children, (child, index) => (
        <Row first={index === 0} key={index} {...props}>
          {child}
        </Row>
      ))}
    </Panel>
  );
}

export default PanelRows;
