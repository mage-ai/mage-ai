import React from 'react';
import styles from '@styles/scss/components/Padding/Padding.module.scss';
import { styleClassNames } from '../shared/utils';

type PaddingProps = {
  children: React.ReactNode;
  small?: boolean;
  xsmall?: boolean;
  bottom?: 'base' | 'small' | 'xsmall';
  left?: 'base' | 'small' | 'xsmall';
  right?: 'base' | 'small' | 'xsmall';
  top?: 'base' | 'small' | 'xsmall';
};

function Padding({ children, ...props }: PaddingProps, ref: React.Ref<HTMLDivElement>) {
  return <div className={styleClassNames(styles, [styles.padding], props)}>{children}</div>;
}

export default React.forwardRef(Padding);
