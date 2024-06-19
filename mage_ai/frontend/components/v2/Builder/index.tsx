import dynamic from 'next/dynamic';

import Grid from '@mana/components/Grid';
import styles from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import pipelines, { PipelineFrameworkInstance } from './mock';
import {
  DataPreparationPipelineExecutionFramework,
  InferencePipelineExecutionFramework,
  RAGPipelineExecutionFramework,
} from '@interfaces/PipelineExecutionFramework/interfaces';

export default function PipelineBuilder() {
  const PipelineCanvas = dynamic(() => import('../Apps/PipelineCanvas'), {
    ssr: false,
  });

  return (
    <div className={styles.container}>
      <Grid autoColumns="auto" height="inherit" templateRows="auto 1fr auto" width="100%">
        <div />

        <Grid autoRows="auto" height="inherit" templateColumns="auto 1fr" width="100%">
          <div />

          {/* @ts-ignore */}
          <PipelineCanvas
            pipeline={RAGPipelineExecutionFramework || PipelineFrameworkInstance}
            pipelines={pipelines}
            pipelineExecutionFramework={RAGPipelineExecutionFramework}
            pipelineExecutionFrameworks={[
              DataPreparationPipelineExecutionFramework,
              InferencePipelineExecutionFramework,
            ]}
          />
        </Grid>

        <div />
      </Grid>
    </div>
  );
}
