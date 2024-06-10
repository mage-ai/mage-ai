import Icon, { IconProps, PathStyle } from '../elements/Icon';
import * as manaIcons from './constants';
import * as oracleIcons from '@oracle/icons/constants';

function useWithIcon(
  arrayOfPathProps: any[],
  iconProps: {
    fill?: string;
    useStroke?: boolean;
    viewBox?: string;
  } = {},
  opts?: {
    withoutBaseIcon?: boolean;
  },
) {
  return (props: IconProps) => {
    const arr = arrayOfPathProps.map(({ Style, ...pathProps }, idx: number) => {
      const itemProps = {
        ...props,
        ...pathProps,
      };

      return Style ? (
        <Style useStroke={iconProps?.useStroke} {...itemProps} key={idx} />
      ) : (
        <PathStyle useStroke={iconProps?.useStroke} {...itemProps} key={idx} />
      );
    });

    if (opts?.withoutBaseIcon) {
      return <>{arr}</>;
    }

    return (
      <Icon {...props} {...iconProps}>
        {arr}
      </Icon>
    );
  };
}

const mapping = Object.entries({
  ...oracleIcons,
  ...manaIcons,
}).reduce(
  (acc, [key, value]) => ({
    ...acc,
    [key]: useWithIcon(...value),
  }),
  {},
);

export default mapping as {
  [key: string]: any;
};
