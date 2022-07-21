import BlockType, { OutputType } from '@interfaces/BlockType';

export function initializeContentAndMessages(blocks: BlockType[]) {
  const messagesInit = {};
  const contentByBlockUUID = {};

  blocks.forEach(({
    content,
    outputs,
    uuid,
  }: BlockType) => {
    if (outputs.length >= 1) {
      messagesInit[uuid] = outputs.map(({
        sample_data: sampleData,
        text_data: textDataJsonString,
        type,
      }: OutputType) => {
        if (sampleData) {
          return {
            data: sampleData,
            type,
          };
        } else if (textDataJsonString) {
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
