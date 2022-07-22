import BlockType, { OutputType } from '@interfaces/BlockType';
import { isJsonString } from '@utils/string';
import { remove, set } from '@storage/localStorage';

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
          text_data: textDataJsonString,
          type,
        } = output || {};
        if (sampleData) {
          return {
            data: sampleData,
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
