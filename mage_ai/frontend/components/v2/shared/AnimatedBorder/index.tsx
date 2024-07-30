import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Styled, StyledProps } from './index.style';

export const SVG_XY_OFFSET = 50;
const DEFAULT_TRANSITION = {
  duration: 2,
  repeat: Infinity,
  ease: "easeInOut",
  repeatType: "loop"
};

function AnimatedBorder({
  children,
  margin,
  height: heightProp,
  padding = 100,
  transition,
  width: widthProp,
  top,
  left,
  zIndex,
}: {
  children?: React.ReactNode;
  padding?: number;
  transition?: {
    duration?: number;
    repeat?: any;
    ease?: any;
    repeatType?: any;
  };
  width?: number;
} & StyledProps, ref) {
  const divRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    top: 0,
    left: 0
  });

  const containerRef = ref ?? divRef;

  useEffect(() => {
    if (!containerRef.current) return;

    setDimensions(containerRef.current.getBoundingClientRect());
  }, []);

  const width = widthProp ?? dimensions.width;
  const height = heightProp ?? dimensions.height;

  return (
    <Styled
      height={height + padding}
      left={left}
      margin={margin}
      ref={containerRef}
      top={top}
      width={width + padding}
      zIndex={zIndex}
    >
      <motion.svg
        className="svg-border"
        width={width + padding}
        height={height + padding}
        viewBox={`0 0 ${width + padding} ${height + padding}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter
            id="neon"
            filterUnits="userSpaceOnUse"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="5"
              result="blur5"
            />
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur10"
            />
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="20"
              result="blur20"
            />
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="30"
              result="blur30"
            />
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="50"
              result="blur50"
            />

            <feMerge result="blur-merged">
              <feMergeNode in="blur10" />
              <feMergeNode in="blur20" />
              <feMergeNode in="blur30" />
              <feMergeNode in="blur50" />
            </feMerge>

            <feColorMatrix
              result="red-blur"
              in="blur-merged"
              type="matrix"
              values="1 0 0 0 0
                      0 0.06 0 0 0
                      0 0 0.44 0 0
                      0 0 0 1 0"
            />
            <feMerge>
              <feMergeNode in="red-blur" />
              <feMergeNode in="blur5" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <svg className="neon" x={SVG_XY_OFFSET} y={SVG_XY_OFFSET}>
          <motion.path
            d={`M 0 0 h ${width} v ${height} h -${width} v -${height}`}
            stroke="lime"
            strokeWidth="3"
            animate={{
              pathLength: [0, 0.85],
              pathOffset: [0, 0.15],
              opacity: [0, 1, 0]
            }}
            transition={{
              ...DEFAULT_TRANSITION,
              ...transition,
            }}
          />
        </svg>
      </motion.svg>

      {children}
    </Styled>
  );
}

export default React.forwardRef(AnimatedBorder);
