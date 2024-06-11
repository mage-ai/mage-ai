import React from 'react';

import styles from '@styles/scss/components/Grid/Grid.module.scss';

function hyphenateCamelCase(camelCase: string): string {
  return camelCase.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

type GridProps = {
  children?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  uuid?: string;
} & {
  [key: string]: any;
};

function Grid(
  {
    children,
    className: classNameProp,
    uuid,
    ...props
  }: GridProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const arr = [
    styles['grid'],
    uuid ? styles['grid-mana'] : '',
    classNameProp || '',
  ];

  Object.entries(props || {}).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      const k = [
        hyphenateCamelCase(key),
        ...String(value)?.replace('%', '')?.split(' '),
      ].join('-');
      const className = styles[k];
      arr.push(className);
    }
  });

  const classNames = arr.filter(value => typeof value !== 'undefined'
    && value !== null
    && String(value)?.length >= 1,
  ).join(' ');

  return (
    <div {...props} className={classNames} ref={ref}>
      {children}
    </div>
  );
}

export default React.forwardRef(Grid);
