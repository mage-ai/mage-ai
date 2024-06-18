import styles from '@styles/scss/elements/Path.module.scss';
import { withStyles } from '../hocs/withStyles';

const Path = withStyles<{
  d: string;
  id?: string;
  stroke?: string;
  strokeWidth?: string;
  fill?: string;
}>(styles, {
  HTMLTag: 'path',
  classNames: ['path'],
});

type PathProps = {
  d: string;
  id?: string;
  stroke?: string;
  strokeWidth?: string;
  fill?: string;
};

const PathComponent = ({
  d,
  id,
  stroke = 'grayhi',
  strokeWidth = '1.5',
  fill = 'none',
  ...rest
}: PathProps & React.HTMLAttributes<SVGPathElement>) => (
  // @ts-ignore
  <Path
    d={d}
    fill={fill}
    id={id}
    stroke={stroke}
    strokeWidth={strokeWidth}
    {...rest}
  />
);

export default PathComponent;
