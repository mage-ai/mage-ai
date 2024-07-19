import React from 'react';

import styles from '@styles/scss/components/Text/Text.module.scss';
import { extractProps } from '../../shared/props';
import { hyphenateCamelCase } from '@utils/string';

export type TextProps = {
  children?: React.ReactNode | string | any;
  className?: string;
  inline?: boolean;
  maxWidth?: number;
  nowrap?: boolean;
  role?: string;
  small?: boolean;
  style?: React.CSSProperties;
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
  pre?: boolean;
  semibold?: boolean;
  secondary?: boolean;
  success?: boolean;
  warning?: boolean;
};

export function buildTextStyleProps({
  className: classNameProp,
  maxWidth,
  nowrap,
  small,
  xsmall,
  ...props
}: TextProps): {
  classNames: string;
  props: any;
} {
  const arr = [
    small ? styles.small : xsmall ? styles.xsmall : styles.text,
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
  };

  return {
    classNames,
    props: xprops,
  };
}

export default function Text({ children, inline, pre, ...rest }: TextProps) {
  const { classNames, props } = buildTextStyleProps(rest as TextProps);

  let El = 'p';
  if (pre) {
    El = 'pre';
  } else if (inline) {
    El = 'span';
  }

  return (
    <El {...props} className={classNames}>
      {children}
    </El>
  );
}
