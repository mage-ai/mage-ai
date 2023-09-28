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
  setSelectedSubTab?: (subTab: SubTabEnum | string) => void;
  showError: (opts: any) => void;
} & StreamDetailProps;

function StreamDetail({
  block,
  height,
  pipeline,
  selectedSubTab,
  setSelectedSubTab,
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
  } else if (SubTabEnum.SETTINGS === selectedSubTab) {
    return (
      <StreamDetailSchemaProperties
        {...propsRest}
        block={block}
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
        setSelectedSubTab={setSelectedSubTab}
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
