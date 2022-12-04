import { useMemo } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import {
  BarStyle,
} from './index.style';
import { pluralize } from '@utils/string';
import {
  pipelineRunEstimatedTimeRemaining,
  pipelineRunProgress,
} from '@utils/models/pipelineRun';
import { range, sum } from '@utils/array';

type SyncRowDetailProps = {
  pipelineRun?: PipelineRunType;
};

function SyncRowDetail({
  pipelineRun,
}: SyncRowDetailProps) {
  const router = useRouter();

  const progress: number = useMemo(() => pipelineRun ? pipelineRunProgress(pipelineRun) : 0, [pipelineRun]);
  const progressBar = useMemo(() => (
    <FlexContainer>
      {range(101).map((i, idx) => (
        <BarStyle
          fill={progress > 0 && Math.round(progress * 100) >= idx}
          even={idx % 2 === 0}
          key={idx}
        />
      ))}
    </FlexContainer>
  ), [progress]);

  const etaByStream =
    useMemo(() => pipelineRun ? pipelineRunEstimatedTimeRemaining(pipelineRun) : {}, [
      pipelineRun,
    ]);
  const eta = useMemo(() => {
    let timeLeft = 0;
    const runtimes = [];
    const streamsWithNoEstimate = [];

    Object.entries(etaByStream).forEach(([stream, obj]) => {
      const {
        completed,
        runtime,
        total,
      } = obj;
      if (runtime === null) {
        streamsWithNoEstimate.push(obj);
      } else {
        runtimes.push(runtime);
        timeLeft += runtime * (total - completed);
      }
    });

    if (runtimes.length === 0) {
      return null;
    }

    const runtimeAverage = sum(runtimes) / runtimes.length;
    streamsWithNoEstimate.forEach(({
      completed,
      total,
    }) => {
      timeLeft += runtimeAverage * (total - completed);
    });

    return timeLeft;
  }, [etaByStream]);

  const statusMessage = useMemo(() => {
    if (RunStatus.COMPLETED === pipelineRun?.status) {
      return 'Sync complete';
    } else if (pipelineRun) {
      if (eta === null) {
        return 'Estimating time remaining...';
      } else {
        const v = Math.ceil(eta / 60)
        return `${pluralize('minute', v, true)} to completion`;
      }
    }

    return 'Select a sync';
  }, [
    eta,
    pipelineRun,
  ])

  return (
    <>
      <Spacing p={3}>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Spacing my={1} mr={2}>
            <Headline
              level={5}
              muted={!pipelineRun}
            >
              {statusMessage}
            </Headline>
          </Spacing>

          {pipelineRun && (
            <Button
              small
              onClick={() => router.push(
                `/pipelines/${pipelineRun.pipeline_uuid}/logs?pipeline_run_id[]=${pipelineRun.id}`,
              )}
            >
              Logs
            </Button>
          )}
        </FlexContainer>

        <Spacing mt={2}>
          {progressBar}
        </Spacing>
      </Spacing>
    </>
  );
}

export default SyncRowDetail;
