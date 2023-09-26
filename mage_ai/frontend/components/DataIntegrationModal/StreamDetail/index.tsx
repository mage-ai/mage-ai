import StreamDetailOverview from './StreamDetailOverview';
import StreamDetailSchemaProperties from './StreamDetailSchemaProperties';
import { StreamDetailProps } from './constants';
import { SubTabEnum } from '../constants';

function StreamDetail({
  selectedSubTab,
  ...propsRest
}: {
  selectedSubTab?: SubTabEnum;
} & StreamDetailProps) {
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
