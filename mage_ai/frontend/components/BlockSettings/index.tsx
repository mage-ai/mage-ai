import { useMemo } from 'react';

import BlockType, { BlockPipelineType } from '@interfaces/BlockType';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { useError } from '@context/Error';

type BlockSettingsProps = {
  block: BlockType;
  pipeline: PipelineType;
};

function BlockSettings({
  block,
  pipeline,
}: BlockSettingsProps) {
  const [showError] = useError(null, {}, [], {
    uuid: 'BlockSettings/index',
  });

  const {
    type: blockType,
    uuid: blockUUID,
  } = block;
  const { data: dataBlock, mutate: fetchBlock } = api.blocks.detail(
    encodeURIComponent(`${blockType}/${blockUUID}`),
    {
      _format: 'with_settings',
    },
  );
  const blockDetails: {
    pipelines: BlockPipelineType;
  } = useMemo(() => dataBlock?.block || {}, [dataBlock]);
  const blockPipelines: BlockPipelineType[] = useMemo(() => blockDetails?.pipelines
    ? Object.values(blockDetails?.pipelines)
    : []
  , [blockDetails]);

  const pipelinesTable = useMemo(() => blockPipelines?.length >= 1 && (
    <Table
      columnFlex={[null, 1]}
      columns={[
        {
          uuid: 'Name',
        },
        {
          uuid: 'Description',
        },
      ]}
      rows={blockPipelines.map(({
        pipeline: {
          description,
          name: pipelineName,
          uuid: pipelineUUID,
        },
      }) => {
        let nameEl;

        if (pipeline?.uuid === pipelineUUID) {
          nameEl = (
            <Text key="name" monospace muted>
              {pipelineName || pipelineUUID}
            </Text>
          );
        } else {
          nameEl = (
            <Link
              href={`/pipelines/${pipelineUUID}/edit`}
              key="name"
              monospace
              openNewWindow
              sameColorAsText
            >
              {pipelineName || pipelineUUID}
            </Link>
          );
        }

        return [
          nameEl,
          <Text default key="description" monospace>
            {description || '-'}
          </Text>,
        ];
      })}
      uuid="git-branch-blockPipelines"
    />
  ), [
    blockPipelines,
    pipeline,
  ]);

  return (
    <>
      {!dataBlock && (
        <Spacing p={PADDING_UNITS}>
          <Spinner inverted />
        </Spacing>
      )}

      {dataBlock && (
        <Spacing mb={UNITS_BETWEEN_SECTIONS}>
          <Spacing p={PADDING_UNITS}>
            <Headline>
              Pipelines
            </Headline>
            <Text default>
              Here are all the pipelines that are using this block.
            </Text>
          </Spacing>

          {pipelinesTable}
        </Spacing>
      )}
    </>
  );
}

export default BlockSettings;
