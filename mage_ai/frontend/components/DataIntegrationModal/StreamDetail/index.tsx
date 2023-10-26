import PipelineType from '@interfaces/PipelineType';
import SampleData from './SampleData';
import StreamDetailOverview from './StreamDetailOverview';
import StreamDetailSchemaProperties from './StreamDetailSchemaProperties';
import { StreamDetailProps } from './constants';
import { SubTabEnum } from '../constants';

type StreamDetailPropsInner = {
  height?: number;
  pipeline: PipelineType;
  selectedSubTab?: SubTabEnum | string;
  showError: (opts: any) => void;
} & StreamDetailProps;

function StreamDetail({
  block,
  height,
  pipeline,
  selectedSubTab,
  showError,
  stream,
  ...propsRest
}: StreamDetailPropsInner) {
  if (SubTabEnum.OVERVIEW === selectedSubTab || !selectedSubTab) {
    return (
      <StreamDetailOverview
        {...propsRest}
        block={block}
        stream={stream}
      />
    );
  } else if (SubTabEnum.SETTINGS === selectedSubTab
    || SubTabEnum.STREAM_CONFLICTS === selectedSubTab
  ) {
    return (
      <StreamDetailSchemaProperties
        {...propsRest}
        block={block}
        showStreamConflicts={SubTabEnum.STREAM_CONFLICTS === selectedSubTab}
        stream={stream}
      />
    );
  } else if (SubTabEnum.SAMPLE_DATA === selectedSubTab) {
    return (
      <SampleData
        block={block}
        height={height}
        pipeline={pipeline}
        showError={showError}
        stream={stream}
      />
    )
  }

  return (
    <>
    </>
  );
}

export default StreamDetail;
