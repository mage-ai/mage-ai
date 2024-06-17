import React, { useImperativeHandle, useRef } from 'react';
import { ElementType, extractProps } from '@mana/shared/types';
import { styleClassNames } from '@mana/shared/utils';

type HOCProps = {
  HTMLTag?: keyof JSX.IntrinsicElements;
  PropTypes?: React.WeakValidationMap<any>;
  classNames?: string[];
};

export type GridType = {
  alignContent?: string;
  alignItems?: string;
  area?: string;
  autoColumns?: string;
  autoFlow?: string;
  autoRows?: string;
  backgroundColor?: string;
  borders?: boolean;
  bordersTransparent?: boolean;
  column?: number;
  columnEnd?: number;
  columnGap?: number;
  columnStart?: number;
  height?: number | string;
  justifyContent?: string;
  justifyItems?: string;
  overflow?: string;
  padding?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  paddingRight?: number | string;
  paddingTop?: number | string;
  placeContent?: string;
  placeItems?: string;
  row?: number;
  rowEnd?: number;
  rowGap?: number;
  rowStart?: number;
  templateAreas?: string;
  templateColumns?: string;
  templateColumnsAutoFitMaxContent?: boolean;
  templateColumnsAutoFitMinContent?: boolean;
  templateColumnsMaxContent?: boolean;
  templateColumnsMinContent?: boolean;
  templateRows?: string;
  templateRowsAutoFitMaxContent?: boolean;
  templateRowsAutoFitMinContent?: boolean;
  templateRowsMaxContent?: boolean;
  templateRowsMinContent?: boolean;
  width?: number | string;
};

export type WithStylesProp = {
  children?: React.ReactNode | Element | Element[] | React.ReactNode[] | any | any[];
  className?: string;
  uuid?: string;
} & ElementType & React.CSSProperties & GridType;

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

export function withStyles<P extends object = WithStylesProp>(
  styles: any,
  propsHOC?: HOCProps,
) {
  const { HTMLTag = 'div', PropTypes, classNames: baseClassNames } = propsHOC || ({} as HOCProps);

  return React.forwardRef<any, P & WithStylesProp>(function StyledComponent(
    {
      children,
      className,
      uuid,
      ...props
    }: P & WithStylesProp,
    ref: any,
  ) {
    const divRef = useRef<HTMLDivElement>(null);

    // Expose the divRef to the parent component through the ref
    useImperativeHandle(ref, () => divRef.current, []);

    const classNames = styleClassNames(
      styles,
      [...(baseClassNames?.map(cn => styles[cn] || '') || []), uuid ? styles[uuid] : '', className || ''],
      { className, uuid, ...props },
    );

    return (
      <HTMLTag
        {...extractProps(props)}
        className={classNames}
        ref={mergeRefs(divRef, ref)}
      >
        {children && (children as React.ReactNode)}
      </HTMLTag>
    );
  });
}
