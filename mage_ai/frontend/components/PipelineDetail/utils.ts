import { NextRouter } from 'next/router';

import BlockType, { OutputType } from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { DataTypeEnum } from '@interfaces/KernelOutputType';
import {
  LOCAL_STORAGE_KEY_DATA_OUTPUT_BLOCK_UUIDS,
  get,
  remove,
  set,
} from '@storage/localStorage';
import {
  dateFormatLongFromUnixTimestamp,
  datetimeInLocalTimezone,
} from '@utils/date';
import { indexBy } from '@utils/array';
import { isJsonString } from '@utils/string';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

export function initializeContentAndMessages(blocks: BlockType[]) {
  const messagesInit = {};
  const contentByBlockUUID = {};

  blocks?.forEach(({
    content,
    outputs,
    type,
    uuid,
  }: BlockType) => {
    if (outputs?.length >= 1) {
      messagesInit[uuid] = outputs.map((output: OutputType) => {
        if (typeof output === 'object') {
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
        } else {
          return {
            data: String(output),
            type: DataTypeEnum.TEXT,
          };
        }
      });
    }

    if (!contentByBlockUUID[type]) {
      contentByBlockUUID[type] = {};
    }

    contentByBlockUUID[type][uuid] = content;
  });

  return {
    content: contentByBlockUUID,
    messages: messagesInit,
  };
}

export function updateCollapsedBlockStates(blocks: BlockType[], pipelineUUID: string, newPipelineUUID: string) {
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

export function removeCollapsedBlockStates(blocks: BlockType[], pipelineUUID: string) {
  blocks.forEach((b) => {
    remove(`${pipelineUUID}/${b.uuid}/codeCollapsed`);
    remove(`${pipelineUUID}/${b.uuid}/outputCollapsed`);
  });
}

export const redirectToFirstPipeline = (pipelines: PipelineType[], router: NextRouter) => {
  const pathname = `/pipelines/${pipelines?.[0]?.uuid}`;
  const query = router.query;

  if (pipelines?.length >= 1) {
    router.push({
      pathname,
      query,
    });
  }
};

export const openSaveFileDialog = (blobResponse: any, filename: string) => {
  if (typeof window !== 'undefined') {
    const url = window.URL.createObjectURL(blobResponse);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
};

export function displayPipelineLastSaved(
  pipeline: PipelineType,
  opts?: {
    isPipelineUpdating?: boolean;
    pipelineContentTouched?: boolean;
    pipelineLastSaved?: Date;
  },
): string {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const isPipelineUpdating = opts?.isPipelineUpdating;
  const pipelineContentTouched = opts?.pipelineContentTouched;
  const pipelineLastSaved = opts?.pipelineLastSaved

  let saveStatus;
  if (pipelineContentTouched) {
    saveStatus = 'Unsaved changes';
  } else if (isPipelineUpdating) {
    saveStatus = 'Saving changes...';
  } else if (pipelineLastSaved) {
    let lastSavedDate = dateFormatLongFromUnixTimestamp(Number(pipelineLastSaved) / 1000);
    if (pipeline?.updated_at) {
      lastSavedDate = datetimeInLocalTimezone(pipeline?.updated_at, displayLocalTimezone);
    }
    saveStatus = `Last saved ${lastSavedDate}`;
  } else {
    saveStatus = 'All changes saved';
  }

  return saveStatus;
}

export function buildBlockRefKey({
  type,
  uuid,
}: {
  type?: string;
  uuid?: string;
}): string {
  return `${type}s/${uuid}.py`;
}
