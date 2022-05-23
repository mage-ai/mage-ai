import React from 'react';
import styled from 'styled-components';
import { UNIT } from '@oracle/styles/units/spacing';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import light from '@oracle/styles/themes/light';

type AnimateProgressType = {
  duration: number;
  end: number;
  start: number;
};

export type ProgressProps = {
  animateProgress?: AnimateProgressType;
  progress?: number;
  danger?: boolean;
};

const ProgressContainerStyle = styled.div<ProgressProps>`
  border-radius: ${BORDER_RADIUS_SMALL};
  height: ${UNIT / 1.75}px;
  overflow: hidden;
  position: relative;
  width: 100%;
`;

const ProgressStyle = styled.div<ProgressProps>`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  background-color: ${light.progress.positive};
  height: inherit;
  position: absolute;

  ${props => props.progress && `
    width: ${props.progress}%;
  `}

  ${props => props.danger && `
    background-color: ${light.progress.negative}
  `}

  ${props => props.animateProgress && `
    animation: animate-progress ${props.animateProgress.duration}ms linear forwards;

    @keyframes animate-progress {
      0% {
        width: ${props.animateProgress.start}%;
      }

      100% {
        width: ${props.animateProgress.end}%;
      }
    }
  `}
`;

const Progress = ({
  ...props
}: ProgressProps) => (
  <ProgressContainerStyle {...props}>
    <ProgressStyle {...props} />
  </ProgressContainerStyle>
);

export default Progress;
