import dynamic from 'next/dynamic';
import Grid from '@mana/components/Grid';
import styles from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import { PipelineDetailProps } from '../interfaces';
import { useMutate } from '@context/APIMutation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';

const Canvas = dynamic(() => import('../../../../Apps/PipelineCanvas'), { ssr: false });

function PipelineBuilder({ frameworkUUID, uuid }: PipelineDetailProps) {
  const phaseRef = useRef(0);
  const [pipeline, setPipeline] = useState<PipelineExecutionFrameworkType>(null);
  const [executionFramework, setExecutionFramework] = useState<PipelineExecutionFrameworkType>(null);

  const pipelines = useMutate({
    id: uuid,
    idParent: frameworkUUID,
    resource: 'pipelines',
    resourceParent: 'execution_frameworks',
  }, {
    handlers: {
      detail: {
        onSuccess: setPipeline,
      },
    },
  });
  const executionFrameworks = useMutate({
    idParent: frameworkUUID,
    resource: 'execution_frameworks'
  }, {
    handlers: {
      detail: {
        onSuccess: setExecutionFramework,
      },
    },
  });

  useEffect(() => {
    if (phaseRef.current === 0) {
      phaseRef.current += 1;
      executionFrameworks.detail.mutate();
      pipelines.detail.mutate()
    }

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
