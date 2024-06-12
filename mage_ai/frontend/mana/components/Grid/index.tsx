import React from 'react';

import styles from '@styles/scss/components/Grid/Grid.module.scss';
import { ElementType, extractProps } from '../../shared/types';
import { hyphenateCamelCase } from '@utils/string';

type GridProps = {
  children?: React.ReactNode | Element | Element[] | React.ReactNode[];
  className?: string;
  uuid?: string;
} & ElementType & {
    [key: string]: any;
  };

function Grid(
  { children, className: classNameProp, uuid, ...props }: GridProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const arr = [styles['grid'], uuid ? styles['grid-mana'] : '', classNameProp || ''];

  Object.entries(props || {}).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      const k = [hyphenateCamelCase(key), ...String(value)?.replace('%', '')?.split(' ')]
        .filter(s => s?.length >= 1)
        ?.join('-');
      const className = styles[k];
      arr.push(className);
    }
  });

  [classNameProp, uuid].forEach(key => {
    if (key?.length >= 1 && !arr?.includes(key)) {
      arr.push(key);
    }
  });

  const classNames = arr
    .filter(value => typeof value !== 'undefined' && value !== null && String(value)?.length >= 1)
    .join(' ');

  return (
    <div {...extractProps(props)} className={classNames} ref={ref}>
      {children && (children as React.ReactNode)}
    </div>
  );
}

export default React.forwardRef(Grid);
