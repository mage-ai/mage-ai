import React, { useMemo } from 'react';

import BlockExtraRow from './BlockExtraRow';
import BlockType from '@interfaces/BlockType';
import Flex from '@oracle/components/Flex';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { AddonBlockTypeEnum } from '@interfaces/AddonBlockOptionType';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { indexBy } from '@utils/array';

type BlockExtrasProps = {
  block: BlockType;
  blocks: BlockType[];
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    addon?: AddonBlockTypeEnum,
    blockUUID: string;
    extension?: string;
  }) => void;
  pipeline: PipelineType;
};

function BlockExtras({
  block,
  blocks,
  openSidekickView,
  pipeline,
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

  const extensionBlocks = useMemo(() => {
    const arr = [];

    Object.entries(pipeline?.extensions || {})?.forEach(([
      extensionUUID,
      {
        blocks: blocksForExtension,
      },
    ]) => {
      blocksForExtension?.forEach(({
        upstream_blocks: upstreamBlocks,
        uuid: blockUUID,
      }) => {
        if (upstreamBlocks?.includes(block?.uuid)) {
          const b = blocksByUUID?.[blockUUID];
          if (b) {
            arr.push({
              ...b,
              extension_uuid: extensionUUID,
            });
          }
        }
      });
    });

    return arr;
  }, [
    block,
    blocksByUUID,
    pipeline,
  ]);

  const cb = useMemo(() => conditionalBlocks?.length, [conditionalBlocks]);
  const callb = useMemo(() => callbackBlocks?.length, [callbackBlocks]);
  const eb = useMemo(() => extensionBlocks?.length, [extensionBlocks]);

  if (!cb && !callb && !eb) {
    return null;
  }

  return (
    <Spacing pb={(cb >= 1 || callb >= 1 || eb >= 1) ? 1 : 0}>
      {cb >= 1 && (
        <Spacing mt={1}>
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
        </Spacing>
      )}

      {callb >= 1 && (
        <Spacing mt={1}>
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
        </Spacing>
      )}

      {eb >= 1 && (
        <Spacing mt={1}>
          <Flex flexDirection="column">
            <Spacing px={1}>
              <Text bold muted>
                Extensions
              </Text>
            </Spacing>
            <BlockExtraRow
              blocks={extensionBlocks}
              onClick={({
                extension_uuid: extensionUUID,
                uuid,
              }) => openSidekickView(ViewKeyEnum.EXTENSIONS, true, {
                blockUUID: uuid,
                extension: extensionUUID,
              })}
            />
          </Flex>
        </Spacing>
      )}
    </Spacing>
  );
}

export default BlockExtras;
