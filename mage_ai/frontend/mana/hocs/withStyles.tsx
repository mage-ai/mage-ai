import React, { useImperativeHandle, useRef } from 'react';
import { extractProps } from '../shared/props';
import { styleClassNames } from '@mana/shared/utils';

type HOCProps = {
  HTMLTag?: any;
  PropTypes?: any;
  classNames?: any;
  allowDynamicStyles?:  any;
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
  bordersBottom?: boolean;
  column?: number;
  columnEnd?: number;
  columnGap?: number;
  columnStart?: number;
  data?: Record<string, any>;
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
  children?: any;
  className?: string;
  id?: string;
  onContextMenu?: (event: React.MouseEvent) => void;
  role?: any;
  uuid?: string;
} & any &
  React.CSSProperties &
  GridType;

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

export function withStyles<P extends object = WithStylesProp>(styles: any, propsHOC?: HOCProps) {
  const {
    HTMLTag = 'div',
    PropTypes,
    classNames: baseClassNames,
    allowDynamicStyles = false,
  } = propsHOC || ({} as HOCProps);

  return React.forwardRef<any, P & WithStylesProp>(function StyledComponent(
    { children, className, id, onContextMenu, role, uuid, ...props }: P & WithStylesProp,
    ref: any,
  ) {
    const divRef = useRef<HTMLDivElement>(null);

    const data = Object.entries(props ?? {})
      ?.filter(([key]) => key?.startsWith('data-'))
      ?.reduce((acc, [key, value]) => {
        acc[key] = value;
        delete props[key];
        return acc;
      }, {});

    // Expose the divRef to the parent component through the ref
    useImperativeHandle(ref, () => divRef.current, []);

    const classNames = styleClassNames(
      styles,
      [
        ...(baseClassNames?.map(cn => styles[cn] || '') || []),
        uuid ? styles[uuid] : '',
        className || '',
      ],
      { className, uuid, ...props },
    );

    // Build additional dynamic styles if allowed
    const dynamicStyles = allowDynamicStyles
      ? {
          fill: props.fill,
          stroke: props.stroke,
          strokeWidth: props.strokeWidth,
        }
      : {};

    const propsExtracted = extractProps(props);
    if (allowDynamicStyles) {
      propsExtracted.style = { ...propsExtracted.style, ...dynamicStyles };
    }

    return (
      // @ts-ignore
      <HTMLTag
        {...propsExtracted}
        className={classNames}
        id={id}
        onContextMenu={onContextMenu}
        // @ts-ignore
        ref={mergeRefs(divRef, ref)}
        role={role}
        {...data}
      >
        {children && (children as React.ReactNode)}
      </HTMLTag>
    );
  });
}
