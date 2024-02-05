import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

export enum LoadingStyleEnum {
  DEFAULT = 'default',
  BLOCKS = 'blocks',
}

type LoadingProps = {
  color?: string;
  colorLight?: string;
  height?: number;
  loadingStyle?: LoadingStyleEnum;
  width?: string | number;
};

const LoadingStyleBlocks = styled.div<LoadingProps>`
  display: flex;
  align-items: center;

  ${props => `
    .loader {
      display: inline-flex;
      gap: 5px;
    }
    .loader:before,
    .loader:after {
      content: "";
      width: ${typeof props.width === 'string'
        ? props.width
        : typeof props.width === 'number'
          ? `${props.width}px`
          : `${(UNIT * 2)}px`
      };
      aspect-ratio: 1;
      box-shadow: 0 0 0 1px inset ${props?.color || (props.theme || dark).content.active};
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
  `}
`;

const InfiniteBlocksStyle = styled.div`
/* HTML: <div class="loader"></div> */
.loader {
  width: 120px;
  height: 20px;
  background:
   linear-gradient(#000 0 0) left/20px 20px no-repeat
   #ddd;
  animation: l1 1s infinite linear;
}
@keyframes l1 {
    50% {background-position: right }
}


/* HTML: <div class="loader"></div> */
.loader {
  width: 120px;
  height: 20px;
  background:
    linear-gradient(#000 50%,#0000 0),
    linear-gradient(#0000 50%,#000 0),
    linear-gradient(#000 50%,#0000 0),
    linear-gradient(#0000 50%,#000 0),
    linear-gradient(#000 50%,#0000 0),
    linear-gradient(#0000 50%,#000 0)
    #ddd;
  background-size: calc(100%/6 + 1px) 200%;
  background-repeat: no-repeat;
  animation: l12 2s infinite;
}
@keyframes l12 {
  0%     {background-position: calc(0*100%/5) 100%,calc(1*100%/5)   0%,calc(2*100%/5) 100%,calc(3*100%/5)   0%,calc(4*100%/5) 100%,calc(5*100%/5)   0%}
  16.67% {background-position: calc(0*100%/5)   0%,calc(1*100%/5)   0%,calc(2*100%/5) 100%,calc(3*100%/5)   0%,calc(4*100%/5) 100%,calc(5*100%/5)   0%}
  33.33% {background-position: calc(0*100%/5)   0%,calc(1*100%/5) 100%,calc(2*100%/5) 100%,calc(3*100%/5)   0%,calc(4*100%/5) 100%,calc(5*100%/5)   0%}
  50%    {background-position: calc(0*100%/5)   0%,calc(1*100%/5) 100%,calc(2*100%/5)   0%,calc(3*100%/5)   0%,calc(4*100%/5) 100%,calc(5*100%/5)   0%}
  66.67% {background-position: calc(0*100%/5)   0%,calc(1*100%/5) 100%,calc(2*100%/5)   0%,calc(3*100%/5) 100%,calc(4*100%/5) 100%,calc(5*100%/5)   0%}
  83.33% {background-position: calc(0*100%/5)   0%,calc(1*100%/5) 100%,calc(2*100%/5)   0%,calc(3*100%/5) 100%,calc(4*100%/5)   0%,calc(5*100%/5)   0%}
  100%   {background-position: calc(0*100%/5)   0%,calc(1*100%/5) 100%,calc(2*100%/5)   0%,calc(3*100%/5) 100%,calc(4*100%/5)   0%,calc(5*100%/5) 100%}
}
`;

const ScrollingBarsStyle = styled.div`
/* HTML: <div class="loader"></div> */
.loader {
  width: 90px;
  height: 14px;
  background: repeating-linear-gradient(90deg,#000 0 calc(25% - 5px),#0000 0 25%) left/calc(4*100%/3) 100%;
  animation: l1 0.5s infinite linear;
}
@keyframes l1 {
    100% {background-position: right}
}
`;

const RepeatingBarStyle = styled.div<LoadingProps>`
${props => `
  .loader {
    height: ${props?.height || (UNIT / 4)}px;
    width: ${props.width || '100%'};
    --c:no-repeat linear-gradient(${props?.color || (props.theme || dark).background.success} 0 0);
    background: var(--c),var(--c), ${props?.colorLight || (props.theme || dark).background.successLight};
    background-size: 60% 100%;
    animation: l16 3s infinite;
  }

  @keyframes l16 {
    0%   {background-position:-150% 0,-150% 0}
    66%  {background-position: 250% 0,-150% 0}
    100% {background-position: 250% 0, 250% 0}
  }
`}
`;

function Loading({
  loadingStyle = LoadingStyleEnum.DEFAULT,
  ...props
}: LoadingProps) {
  if (LoadingStyleEnum.BLOCKS === loadingStyle) {
    return (
      <LoadingStyleBlocks {...props}>
        <div className="loader" />
      </LoadingStyleBlocks>
    );
  }

  return (
    <RepeatingBarStyle {...props}>
      <div className="loader" />
    </RepeatingBarStyle>
  );
}

export default Loading;
