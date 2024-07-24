import Grid from '@mana/components/Grid';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import dynamic from 'next/dynamic';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import stylesPipelineBuilder from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import PipelineType from '@interfaces/PipelineType';
import { CanvasProps } from '@components/v2/Apps/PipelineCanvas/CanvasV2';

interface PipelineDetailProps {
  framework: PipelineExecutionFrameworkType;
  useExecuteCode: any;
  useRegistration: any;
  pipeline: PipelineType;
}

const PipelineCanvas = dynamic(() => import('@components/v2/Apps/PipelineCanvas'), { ssr: false });

function PipelineBuilder(props: PipelineDetailProps & CanvasProps) {
  return (
    <div className={[stylesHeader.content, stylesPipelineBuilder.container].join(' ')}>
      <Grid autoColumns="auto" height="inherit" templateRows="auto 1fr auto" width="100%">
        <div />

        <Grid autoRows="auto" height="inherit" templateColumns="auto 1fr" width="100%">
          <div />

          <PipelineCanvas {...props as any}  />
        </Grid>

        <div />
      </Grid>
    </div>
  );
}

export default PipelineBuilder;
