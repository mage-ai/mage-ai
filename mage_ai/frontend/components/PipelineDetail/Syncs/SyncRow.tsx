import PipelineRunType from '@interfaces/PipelineRunType';
import Headline from '@oracle/elements/Headline';
import Text from '@oracle/elements/Text';

type SyncRowProps = {
  pipelineRun: PipelineRunType;
};

function SyncRow({
  pipelineRun,
}: SyncRowProps) {
  const {
    created_at: createdAt,
    metrics,
    status,
  } = pipelineRun;

  console.log(metrics)

  const {
    blocks: blockMetrics = {},
    pipeline: pipelineMetrics = {},
  } = metrics || {};

  const numberOfStreams = Object.keys(pipelineMetrics).length;

  return (
    <div>
      <Headline level={5}>
        {createdAt}
      </Headline>

      <Text>
        {status}
      </Text>

      <Text>
        Number of streams: {numberOfStreams}
      </Text>
    </div>
  );
}

export default SyncRow;
