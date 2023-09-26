import StreamDetailOverview from './StreamDetailOverview';
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
  }

  return (
    <>
    </>
  );
}

export default StreamDetail;
