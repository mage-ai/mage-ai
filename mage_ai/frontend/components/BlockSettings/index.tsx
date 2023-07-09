import { useMemo } from 'react';

import BlockType from '@interfaces/BlockType';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { useError } from '@context/Error';

type BlockSettingsProps = {
  block: BlockType;
};

function BlockSettings({
  block,
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
  const blockDetails = useMemo(() => dataBlock?.block, [dataBlock]);

  return (
    <Spacing p={PADDING_UNITS}>
    </Spacing>
  );
}

export default BlockSettings;
