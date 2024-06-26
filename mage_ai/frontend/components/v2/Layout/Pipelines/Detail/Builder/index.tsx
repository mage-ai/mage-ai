import dynamic from 'next/dynamic';
import Grid from '@mana/components/Grid';
import styles from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import { PipelineDetailProps } from '../interfaces';
import useMutate, { MutationStatusEnum } from '@api/useMutate';
import { useEffect, useMemo, useState } from 'react';
import { PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';

const Canvas = dynamic(() => import('../../../../Apps/PipelineCanvas'), { ssr: false });

function PipelineBuilder({ frameworkUUID, uuid }: PipelineDetailProps) {
  const [pipeline, setPipeline] = useState<PipelineExecutionFrameworkType>(null);
  const [executionFramework, setExecutionFramework] = useState<PipelineExecutionFrameworkType>(null);

  const pipelines = useMutate(['pipelines', 'execution_frameworks'], {
    handlers: {
      detail: {
      onSuccess: (data) => {
        setPipeline(data);
      },
      },
    },
  });
  const executionFrameworks = useMutate('execution_frameworks', {
    handlers: {
      detail: {
      onSuccess: (data) => {
        setExecutionFramework(data);
      },
      },
    },
  });

  useEffect(() => {
    executionFrameworks.detail.mutate({ id: frameworkUUID }, {
      onSuccess: () => pipelines.detail.mutate({ id: [frameworkUUID, uuid] }),
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <Grid autoColumns="auto" height="inherit" templateRows="auto 1fr auto" width="100%">
        <div />

        <Grid autoRows="auto" height="inherit" templateColumns="auto 1fr" width="100%">
          <div />

          <Canvas
            executionFramework={executionFramework}
            loading={!executionFramework || !pipeline}
            pipeline={pipeline}
          />
        </Grid>

        <div />
      </Grid>
    </div>
  );
}

export default PipelineBuilder;
