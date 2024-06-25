import React from 'react';

type HexagonProps = {
  backgroundColor?: string;
  backgroundColorName?: string; // Background color
  borderColor?: string;
  borderColorName?: string;
  borderWidth?: number;
  children?: React.ReactNode;
  containerSize?: number; // Size of the square container
  gradientId?: string; // ID for the gradient
  imageSrc?: string;
  margin?: string;
  padding?: string;
  size?: number; // Width of the hexagon
  textColor?: string;
};

export default function Hexagon({
  backgroundColor,
  backgroundColorName,
  borderColor,
  borderColorName = 'colors-whitelo',
  borderWidth = 2, // Default border width
  padding,
  children,
  containerSize: containerSizeProp,
  gradientId,
  imageSrc,
  margin,
  size = 100,
  textColor,
}: HexagonProps) {
  // Calculate container size
  const containerSize = containerSizeProp || size;

  // Original hexagon path (with border radius)
  const hexagonPath = "M10.6029 1.96129C12.0862 1.10491 13.9138 1.10491 15.3971 1.96129L23.0933 6.40473C24.5766 7.26112 25.4904 8.84379 25.4904 10.5566V19.4434C25.4904 21.1562 24.5766 22.7389 23.0933 23.5953L15.3971 28.0387C13.9138 28.8951 12.0862 28.8951 10.6029 28.0387L2.90668 23.5953C1.42337 22.7389 0.509619 21.1562 0.509619 19.4434V10.5566C0.509619 8.84379 1.42337 7.26112 2.90668 6.40473L10.6029 1.96129Z";

  return (
    <svg
      width={containerSize}
      height={containerSize}
      viewBox="0 0 26 30" // Use the original viewBox to match the path's aspect ratio
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: containerSize, // Scaled width
        height: containerSize, // Scaled height
        margin,
      }}
    >
      <defs>
        <clipPath id="hexClip">
          <path d={hexagonPath} />
        </clipPath>
        {/* Gradient definition */}
        {gradientId && (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {/* Replace these stops with your gradient colors */}
            <stop offset="0%" style={{ stopColor: 'red', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'blue', stopOpacity: 1 }} />
          </linearGradient>
        )}
      </defs>
      {/* Outer hexagon path for border with fill as none and stroke for border */}
      <path d={hexagonPath} stroke={borderColor ?? `var(--${borderColorName})`} strokeWidth={borderWidth} fill="none" />
      {/* Background color or gradient within inner hexagon */}
      <path
        d={hexagonPath}
        fill={gradientId ? `url(#${gradientId})` : backgroundColor ?? `var(--${backgroundColorName})`}
        clipPath="url(#hexClip)" // Clip path to ensure background respects the hexagon boundaries
      />
      {/* Image clipped to the hexagon */}
      {imageSrc && (
        <foreignObject
          x="0"
          y="0"
          width="100%"
          height="100%"
          clipPath="url(#hexClip)"
        >
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden' // Ensure the image respects the hexagon boundaries
          }}>
            <img
              src={imageSrc}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        </foreignObject>
      )}
      {children && (
        <foreignObject
          x="0"
          y="0"
          width="100%"
          height="100%"
          clipPath="url(#hexClip)"
        >
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: textColor || 'white',
            padding,
            boxSizing: 'border-box',
          }}>
            {children}
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
