import StreamDetailOverview from './StreamDetailOverview';
import StreamDetailSchemaProperties from './StreamDetailSchemaProperties';
import { StreamType } from '@interfaces/IntegrationSourceType';
import { StreamsOverviewProps } from '../StreamsOverview';
import { SubTabEnum } from '../constants';

type StreamDetailProps = {
  selectedSubTab?: SubTabEnum;
  setBlockAttributes: (prev: any) => void;
  stream: StreamType;
} & StreamsOverviewProps;

function StreamDetail({
  selectedSubTab,
  ...propsRest
}: StreamDetailProps) {
  if (SubTabEnum.OVERVIEW === selectedSubTab || !selectedSubTab) {
    return (
      <StreamDetailOverview
        {...propsRest}
      />
    );
  } else if (SubTabEnum.SETTINGS === selectedSubTab) {
    return (
      <StreamDetailSchemaProperties
        {...propsRest}
      />
    );
  }

  return (
    <>
    </>
  );
}

export default StreamDetail;
