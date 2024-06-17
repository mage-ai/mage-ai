import React, { useImperativeHandle, useRef } from 'react';
import { ElementType, extractProps } from '@mana/shared/types';
import { styleClassNames } from '@mana/shared/utils';

type HOCProps = {
  HTMLTag?: 'div' | 'svg';
  classNames?: string[];
};

export type WithStylesProp = {
  children?: React.ReactNode | Element | Element[] | React.ReactNode[] | any | any[];
  className?: string;
  uuid?: string;
} & ElementType;

// Utility function to merge multiple refs
function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (value: T | null) => {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

export function withStyles(styles: any, propsHOC?: HOCProps) {
  const { HTMLTag = 'div', classNames: baseClassNames } = propsHOC || ({} as HOCProps);

  return React.forwardRef<any, WithStylesProp>(function StyledComponent(
    {
      children,
      className,
      uuid,
      ...props
    }: {
      children?: React.ReactNode | Element | Element[] | React.ReactNode[] | any | any[];
      className?: string;
      uuid?: string;
    },
    ref: any,
  ) {
    const divRef = useRef<HTMLDivElement>(null);

    // Expose the divRef to the parent component through the ref
    useImperativeHandle(ref, () => divRef.current, []);

    const classNames = styleClassNames(
      styles,
      [...baseClassNames?.map(cn => styles[cn] || ''), uuid ? styles[uuid] : '', className || ''],
      // @ts-ignore
      { className, uuid, ...props },
    );

    return (
      <HTMLTag
        {...extractProps(props)}
        className={classNames}
        // @ts-ignore
        ref={mergeRefs(divRef, ref)}
      >
        {children && (children as React.ReactNode)}
      </HTMLTag>
    );
  });
}
