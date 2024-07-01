import dynamic from 'next/dynamic';
import Grid from '@mana/components/Grid';
import styles from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import { PipelineDetailProps } from '../interfaces';
import { useMutate } from '@context/APIMutation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import DetailLayout from '../DetailLayout';

const Canvas = dynamic(() => import('../../../../Apps/PipelineCanvas'), { ssr: false });

function PipelineBuilder({ frameworkUUID, registerConsumer, uuid }: PipelineDetailProps) {
  return (
    <DetailLayout loadEditorServices>
      <div className={styles.container}>
        <Grid autoColumns="auto" height="inherit" templateRows="auto 1fr auto" width="100%">
          <div />

          <Grid autoRows="auto" height="inherit" templateColumns="auto 1fr" width="100%">
            <div />

            <Canvas
              executionFrameworkUUID={frameworkUUID}
              pipelineUUID={uuid}
              registerConsumer={registerConsumer}
            />
          </Grid>

          <div />
        </Grid>
      </div>
    </DetailLayout >
  );
}

export default PipelineBuilder;