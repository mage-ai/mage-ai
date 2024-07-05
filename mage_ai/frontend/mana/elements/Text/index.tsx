import React from 'react';

import styles from '@styles/scss/components/Text/Text.module.scss';
import { ElementType, extractProps } from '../../shared/types';
import { hyphenateCamelCase } from '@utils/string';

type TextProps = {
  children: React.ReactNode | string | any;
  className?: string;
  inline?: boolean;
  maxWidth?: number;
  nowrap?: boolean;
  small?: boolean;
  underline?: boolean;
  xsmall?: boolean;
  // Below alter the class names
  black?: boolean;
  blue?: boolean;
  bold?: boolean;
  inverted?: boolean;
  italic?: boolean;
  light?: boolean;
  medium?: boolean;
  monospace?: boolean;
  muted?: boolean;
  semibold?: boolean;
  secondary?: boolean;
  success?: boolean;
  warning?: boolean;
} & ElementType;

function Text({ children, className: classNameProp, inline, maxWidth, nowrap, small, xsmall, ...props }: TextProps) {
  const arr = [
    small
      ? styles.small
      : xsmall
        ? styles.xsmall
        : styles.text,
    classNameProp || '',
    nowrap && styles.nowrap,
  ].filter(Boolean);

  Object.entries(props || {}).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      if (value !== false) {
        const k = [
          hyphenateCamelCase(key),
          ...String(typeof value === 'boolean' ? '' : value)
            ?.replace('%', '')
            ?.split(' '),
        ]
          .filter(s => s?.length >= 1)
          ?.join('-');
        const className = styles[k];
        arr.push(className);
      }
    }
  });

  const classNames = arr
    .filter(value => typeof value !== 'undefined' && value !== null && String(value)?.length >= 1)
    .join(' ');

  const xprops = extractProps(props);
  xprops.style = {
    ...xprops.style,
    maxWidth: maxWidth ? `${maxWidth}px` : undefined,
  }

  return inline ? (
    <span {...xprops} className={classNames}>
      {children}
    </span>
  ) : (
    <p {...xprops} className={classNames}>
      {children}
    </p>
  );
}

export default Text;
