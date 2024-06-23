import dynamic from 'next/dynamic';

import Grid from '@mana/components/Grid';
import styles from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import RAGPipeline, {
  DataPreparationPipeline,
  ExportPipeline,
  IndexPipeline,
  InferencePipeline,
  LoadPipeline,
  QueryProcessingPipeline,
  ResponseGenerationPipeline,
  RetrievalPipeline,
  TransformPipeline,
} from './mock';
import DataPreparation, {
  Load,
  Transform,
  Export,
  Index,
} from '@interfaces/PipelineExecutionFramework/rag/dataPreparation';
import Inference, {
  QueryProcessing,
  Retrieval,
  ResponseGeneration,
} from '@interfaces/PipelineExecutionFramework/rag/inference';
import RAG from '@interfaces/PipelineExecutionFramework/rag';

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
            pipeline={RAGPipeline}
            pipelineExecutionFramework={RAG}
            pipelineExecutionFrameworks={[
              DataPreparation,
              Export,
              Index,
              Inference,
              Load,
              QueryProcessing,
              ResponseGeneration,
              Retrieval,
              Transform,
            ]}
            pipelines={[
              DataPreparationPipeline,
              ExportPipeline,
              IndexPipeline,
              InferencePipeline,
              LoadPipeline,
              QueryProcessingPipeline,
              ResponseGenerationPipeline,
              RetrievalPipeline,
              TransformPipeline,
            ]}
          />
        </Grid>

        <div />
      </Grid>
    </div>
  );
}
