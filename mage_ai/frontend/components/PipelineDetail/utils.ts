import BlockType, { OutputType } from '@interfaces/BlockType';
import {
  LOCAL_STORAGE_KEY_DATA_OUTPUT_BLOCK_UUIDS,
  get,
  remove,
  set,
} from '@storage/localStorage';
import { indexBy } from '@utils/array';
import { isJsonString } from '@utils/string';

export function initializeContentAndMessages(blocks: BlockType[]) {
  const messagesInit = {};
  const contentByBlockUUID = {};

  blocks.forEach(({
    content,
    outputs,
    uuid,
  }: BlockType) => {
    if (outputs.length >= 1) {
      messagesInit[uuid] = outputs.map((output: OutputType) => {
        const {
          sample_data: sampleData,
          shape: shape,
          text_data: textDataJsonString,
          type,
        } = output || {};
        if (sampleData) {
          return {
            data: {
              shape,
              ...sampleData,
            },
            type,
          };
        } else if (textDataJsonString && isJsonString(textDataJsonString)) {
          return JSON.parse(textDataJsonString);
        }

        return textDataJsonString;
      });
    }
    contentByBlockUUID[uuid] = content;
  });

  return {
    content: contentByBlockUUID,
    messages: messagesInit,
  };
}

export function updateCollapsedBlocks(blocks: BlockType[], pipelineUUID: string, newPipelineUUID: string) {
  blocks.forEach((b) => {
    set(
      `${newPipelineUUID}/${b.uuid}/codeCollapsed`,
      remove(`${pipelineUUID}/${b.uuid}/codeCollapsed`),
    );

    set(
      `${newPipelineUUID}/${b.uuid}/outputCollapsed`,
      remove(`${pipelineUUID}/${b.uuid}/outputCollapsed`),
    );
  });
}

function getOutputBlockUUIDStorageKey(pipelineUUID: string) {
  return `${pipelineUUID}/${LOCAL_STORAGE_KEY_DATA_OUTPUT_BLOCK_UUIDS}`;
}

export function getDataOutputBlockUUIDs(pipelineUUID: string): string[] {
  return get(getOutputBlockUUIDStorageKey(pipelineUUID), []);
}

export function addDataOutputBlockUUID(
  pipelineUUID: string,
  blockUUID: string,
) {
  const blockUUIDs = getDataOutputBlockUUIDs(pipelineUUID);
  if (!blockUUIDs.includes(blockUUID)) {
    set(getOutputBlockUUIDStorageKey(pipelineUUID), [
      ...blockUUIDs,
      blockUUID,
    ]);
  }
}

export function removeDataOutputBlockUUID(
  pipelineUUID: string,
  blockUUID: string,
) {
  const blockUUIDs = getDataOutputBlockUUIDs(pipelineUUID);
  const updatedBlockUUIDs = blockUUIDs.filter(uuid => uuid !== blockUUID);

  set(getOutputBlockUUIDStorageKey(pipelineUUID), updatedBlockUUIDs);
}

export function convertBlockUUIDstoBlockTypes(
  uuids: string[],
  blocks: BlockType[],
): BlockType[] {
  const blockUUIDMapping = indexBy(blocks, (block) => block.uuid);
  return uuids
    .map(uuid => blockUUIDMapping[uuid])
    .filter(block => !!block);
}
