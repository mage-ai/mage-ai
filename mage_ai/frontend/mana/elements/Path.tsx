import React, { useEffect } from 'react';
import styles from '@styles/scss/elements/Path.module.scss';
import { motion, useAnimation } from 'framer-motion';
import { withStyles } from '../hocs/withStyles';

const Path = withStyles<{
  d: string;
  id?: string;
  stroke?: string;
  strokeWidth?: string;
  fill?: string;
}>(styles, {
  HTMLTag: 'path',
  allowDynamicStyles: true,
  classNames: ['path'],
});

type PathProps = {
  d: string;
  id?: string;
  stroke?: string;
  strokeWidth?: string;
  fill?: string;
  raw?: boolean;
  style?: React.CSSProperties;
};

function PathComponent(
  {
    d,
    id,
    stroke = 'gray',
    strokeWidth = '1.5',
    fill = 'none',
    raw,
    style: styleProp,
    ...rest
  }: PathProps & React.HTMLAttributes<SVGPathElement>,
  ref: React.Ref<SVGPathElement>,
) {
  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      pathLength: 1,
      transition: { duration: 0.1, ease: 'easeInOut' },
    });
  }, [controls]);

  const props = {
    d,
    fill,
    id,
    ref,
    stroke,
    strokeWidth,
    ...rest,
  };

  if (raw) {
    return (
      // @ts-ignore
      <motion.path {...props} animate={controls} initial={{ pathLength: 0 }} style={styleProp} />
    );
  }

  return (
    // @ts-ignore
    <path {...props} />
  );
}

export default React.forwardRef(PathComponent);
