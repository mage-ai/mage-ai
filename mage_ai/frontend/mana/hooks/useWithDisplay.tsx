import React, { ComponentType } from 'react';
import { Hidden, Visible } from 'react-grid-system';

type DisplayType = {
  lg?: boolean;
  md?: boolean;
  sm?: boolean;
  xl?: boolean;
  xs?: boolean;
  xxl?: boolean;
  xxxl?: boolean;
};

export type WithDisplayProps = {
  children?: React.ReactNode;
  hidden?: DisplayType;
  visible?: DisplayType;
};

const useWithDisplay = <P extends object>(Component: ComponentType<P>) =>
  React.forwardRef<unknown, P & WithDisplayProps>((props, ref) => {
    const { children, hidden, visible, ...restProps } = props;

    let el = children;
    if (hidden) {
      el = <Hidden {...hidden}>{el}</Hidden>;
    } else if (visible) {
      el = <Visible {...visible}>{el}</Visible>;
    }

    return (
      <Component {...(restProps as P)} ref={ref}>
        {el}
      </Component>
    );
  });

export default useWithDisplay;
