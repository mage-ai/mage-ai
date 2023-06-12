import React, { useMemo } from 'react';

import BlockExtraRow from './BlockExtraRow';
import BlockType from '@interfaces/BlockType';
import Flex from '@oracle/components/Flex';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { AddonBlockTypeEnum } from '@interfaces/AddonBlockOptionType';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { indexBy } from '@utils/array';

type BlockExtrasProps = {
  block: BlockType;
  blocks: BlockType[];
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    addon: AddonBlockTypeEnum,
    blockUUID: string;
  }) => void;
};

function BlockExtras({
  block,
  blocks,
  openSidekickView,
}: BlockExtrasProps) {
  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);
  const callbackBlocks = useMemo(() => block?.callback_blocks?.reduce((acc, uuid) => {
    const b = blocksByUUID?.[uuid];
    if (b) {
      return acc.concat(b);
    }

    return acc;
  }, []), [
    block,
    blocksByUUID,
  ]);

  const conditionalBlocks = useMemo(() => block?.conditional_blocks?.reduce((acc, uuid) => {
    const b = blocksByUUID?.[uuid];
    if (b) {
      return acc.concat(b);
    }

    return acc;
  }, []), [
    block,
    blocksByUUID,
  ]);

  return (
    <>
      {conditionalBlocks?.length >= 1 && (
        <Flex flexDirection="column">
          <Spacing px={1}>
            <Text bold muted>
              Conditionals
            </Text>
          </Spacing>
          <BlockExtraRow
            blocks={conditionalBlocks}
            onClick={({ uuid }) => openSidekickView(ViewKeyEnum.ADDON_BLOCKS, true, {
              addon: AddonBlockTypeEnum.CONDITIONAL,
              blockUUID: uuid,
            })}
          />
        </Flex>
      )}
      <Spacing mb={1} />
      {callbackBlocks?.length >= 1 && (
        <Flex flexDirection="column">
          <Spacing px={1}>
            <Text bold muted>
              Callbacks
            </Text>
          </Spacing>
          <BlockExtraRow
            blocks={callbackBlocks}
            onClick={({ uuid }) => openSidekickView(ViewKeyEnum.ADDON_BLOCKS, true, {
              addon: AddonBlockTypeEnum.CALLBACK,
              blockUUID: uuid,
            })}
          />
        </Flex>
      )}
    </>
  );
}

export default BlockExtras;
