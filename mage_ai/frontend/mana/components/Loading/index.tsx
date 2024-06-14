import React from 'react';
import styled from 'styled-components';

export enum LoadingStyleEnum {
  BLOCKS = 'blocks',
  DEFAULT = 'default',
  INFINITE_BLOCKS = 'infinite_blocks',
  SCROLLING_BARS = 'scrolling_bars',
}

type LoadingProps = {
  className?: string;
  color?: string;
  colorLight?: string;
  height?: number;
  loadingStyle?: LoadingStyleEnum;
  position?: 'absolute' | 'fixed' | 'relative' | 'static' | 'sticky';
  vertical?: boolean;
  width?: string | number;
};

const LoadingStyleBlocks = styled.div<LoadingProps>`
  display: flex;
  align-items: center;

  ${({ color, theme, vertical, width }) => `

    ${
      vertical
        ? `
      .loader {
        display: inline-flex;
        gap: 2px;
      }

      .loader:before,
      .loader:after {
        content: "";
        width: ${
          typeof width === 'string' ? width : typeof width === 'number' ? `${width}px` : '12px'
        };
        aspect-ratio: 1;
        box-shadow: 0 0 0 1.5px inset ${color || theme.colors.typography.text.base};
        animation: l4 1.5s infinite;
      }

      .loader:after {
        --s: -1;
        animation-delay: 0.75s
      }

      @keyframes l4 {
        0%     {transform: scaleY(var(--s,1)) translateY(0) rotate(0)}
        16.67% {transform: scaleY(var(--s,1)) translateY(-50%) rotate(0)}
        33.33% {transform: scaleY(var(--s,1)) translateY(-50%) rotate(90deg)}
        50%,
        100%   {transform: scaleY(var(--s,1)) translateY(0) rotate(90deg)}
      }
    `
        : `
      .loader {
        display: inline-flex;
        gap: 2px;
      }
      .loader:before,
      .loader:after {
        content: "";
        width: ${
          typeof width === 'string' ? width : typeof width === 'number' ? `${width}px` : '12px'
        };
        aspect-ratio: 1;
        box-shadow: 0 0 0 1.5px inset ${color || theme.colors.typography.text.base};
        animation: l4 1.5s infinite;
      }
      .loader:after {
        --s: -1;
        animation-delay: 0.75s
      }

      @keyframes l4 {
        0%     {transform:scaleX(var(--s,1)) translate(0) rotate(0)}
        16.67% {transform:scaleX(var(--s,1)) translate(-50%) rotate(0)}
        33.33% {transform:scaleX(var(--s,1)) translate(-50%) rotate(90deg)}
        50%,
        100%   {transform:scaleX(var(--s,1)) translate(0) rotate(90deg)}
      }
    `
    }
  `}
`;

const InfiniteBlocksStyle = styled.div`
  /* HTML: <div class="loader"></div> */
  .loader {
    width: 120px;
    height: 20px;
    background: linear-gradient(#000 0 0) left/20px 20px no-repeat #ddd;
    animation: l1 1s infinite linear;
  }
  @keyframes l1 {
    50% {
      background-position: right;
    }
  }

  /* HTML: <div class="loader"></div> */
  .loader {
    width: 120px;
    height: 20px;
    background:
      linear-gradient(#000 50%, #0000 0),
      linear-gradient(#0000 50%, #000 0),
      linear-gradient(#000 50%, #0000 0),
      linear-gradient(#0000 50%, #000 0),
      linear-gradient(#000 50%, #0000 0),
      linear-gradient(#0000 50%, #000 0) #ddd;
    background-size: calc(100% / 6 + 1px) 200%;
    background-repeat: no-repeat;
    animation: l12 2s infinite;
  }
  @keyframes l12 {
    0% {
      background-position:
        calc(0 * 100% / 5) 100%,
        calc(1 * 100% / 5) 0%,
        calc(2 * 100% / 5) 100%,
        calc(3 * 100% / 5) 0%,
        calc(4 * 100% / 5) 100%,
        calc(5 * 100% / 5) 0%;
    }
    16.67% {
      background-position:
        calc(0 * 100% / 5) 0%,
        calc(1 * 100% / 5) 0%,
        calc(2 * 100% / 5) 100%,
        calc(3 * 100% / 5) 0%,
        calc(4 * 100% / 5) 100%,
        calc(5 * 100% / 5) 0%;
    }
    33.33% {
      background-position:
        calc(0 * 100% / 5) 0%,
        calc(1 * 100% / 5) 100%,
        calc(2 * 100% / 5) 100%,
        calc(3 * 100% / 5) 0%,
        calc(4 * 100% / 5) 100%,
        calc(5 * 100% / 5) 0%;
    }
    50% {
      background-position:
        calc(0 * 100% / 5) 0%,
        calc(1 * 100% / 5) 100%,
        calc(2 * 100% / 5) 0%,
        calc(3 * 100% / 5) 0%,
        calc(4 * 100% / 5) 100%,
        calc(5 * 100% / 5) 0%;
    }
    66.67% {
      background-position:
        calc(0 * 100% / 5) 0%,
        calc(1 * 100% / 5) 100%,
        calc(2 * 100% / 5) 0%,
        calc(3 * 100% / 5) 100%,
        calc(4 * 100% / 5) 100%,
        calc(5 * 100% / 5) 0%;
    }
    83.33% {
      background-position:
        calc(0 * 100% / 5) 0%,
        calc(1 * 100% / 5) 100%,
        calc(2 * 100% / 5) 0%,
        calc(3 * 100% / 5) 100%,
        calc(4 * 100% / 5) 0%,
        calc(5 * 100% / 5) 0%;
    }
    100% {
      background-position:
        calc(0 * 100% / 5) 0%,
        calc(1 * 100% / 5) 100%,
        calc(2 * 100% / 5) 0%,
        calc(3 * 100% / 5) 100%,
        calc(4 * 100% / 5) 0%,
        calc(5 * 100% / 5) 100%;
    }
  }
`;

const ScrollingBarsStyle = styled.div`
  /* HTML: <div class="loader"></div> */
  .loader {
    width: 90px;
    height: 14px;
    background: repeating-linear-gradient(90deg, #000 0 calc(25% - 5px), #0000 0 25%)
      left/calc(4 * 100%/3) 100%;
    animation: l1 0.5s infinite linear;
  }
  @keyframes l1 {
    100% {
      background-position: right;
    }
  }
`;

const RepeatingBarStyle = styled.div<LoadingProps>`
  ${({ color, colorLight, height, position, theme, width }) => `
  position: relative;
  width: ${width || '100%'};

  .loader {
    height: ${height || 2}px;
    width: inherit;
    --c:no-repeat linear-gradient(${color || theme.colors.statuses.success} 0 0);
    background: var(--c),var(--c), ${colorLight || theme.colors.statuses.successHi};
    background-size: 60% 100%;
    animation: l16 3s infinite;
    position: ${position || 'relative'};
  }

  @keyframes l16 {
    0%   {background-position:-150% 0,-150% 0}
    66%  {background-position: 250% 0,-150% 0}
    100% {background-position: 250% 0, 250% 0}
  }
`}
`;

function Loading(
  { className, loadingStyle = LoadingStyleEnum.DEFAULT, ...props }: LoadingProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const element = <div className="loader" />;
  let LoadingStyle = RepeatingBarStyle;

  if (LoadingStyleEnum.BLOCKS === loadingStyle) {
    LoadingStyle = LoadingStyleBlocks;
  } else if (LoadingStyleEnum.SCROLLING_BARS === loadingStyle) {
    LoadingStyle = ScrollingBarsStyle;
  } else if (LoadingStyleEnum.INFINITE_BLOCKS === loadingStyle) {
    LoadingStyle = InfiniteBlocksStyle;
  }

  return (
    <LoadingStyle {...props} className={className} ref={ref}>
      {element}
    </LoadingStyle>
  );
}

export default React.forwardRef(Loading);
