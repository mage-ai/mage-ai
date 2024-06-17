import dynamic from 'next/dynamic';

import Grid from '@mana/components/Grid';
import styles from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import mock from './mock';
import mocks from './mocks';

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
            pipelines={[
              mock.PipelineFrameworkInstance,
              // mocks.PIPELINE_DYNAMIC,
              // mocks.PIPELINE_DEPLOY,
              // mocks.PIPELINE_TRAINING,
            ]}
          />
        </Grid>

        <div />
      </Grid>
    </div>
  );
}
