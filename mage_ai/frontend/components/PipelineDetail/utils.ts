import * as osPath from 'path';
import moment from 'moment';
import { NextRouter } from 'next/router';

import BlockType, {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  OutputType,
} from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { BlockFolderNameEnum, FileExtensionEnum } from '@interfaces/FileType';
import { DataTypeEnum } from '@interfaces/KernelOutputType';
import { DEFAULT_SQL_CONFIG_KEY_LIMIT } from '@components/CodeBlock';
import {
  LOCAL_STORAGE_KEY_DATA_OUTPUT_BLOCK_UUIDS,
  get,
  remove,
  set,
} from '@storage/localStorage';
import { addUnderscores, isJsonString, randomNameGenerator, removeExtensionFromFilename } from '@utils/string';
import {
  dateFormatLong,
  dateFormatLongFromUnixTimestamp,
  datetimeInLocalTimezone,
  momentInLocalTimezone,
} from '@utils/date';
import { getUpstreamBlockUuids } from '@components/CodeBlock/utils';
import { indexBy, range } from '@utils/array';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { isEmptyObject } from '@utils/hash';

function prepareOutput(output) {
  let data;
  let type;

  if (typeof output === 'object') {
    const {
      sample_data: sampleData,
      shape: shape,
      text_data: textDataJsonString,
    } = output || {};
    type = output?.type;

    if (sampleData) {
      data = {
        shape,
        type,
        ...sampleData,
      };
    } else if (textDataJsonString && isJsonString(textDataJsonString)) {
      data = JSON.parse(textDataJsonString);
      type = DataTypeEnum.TABLE;
      if (isEmptyObject(data)) {
        data = null;
        type = DataTypeEnum.TEXT;
      }
    } else {
      data = textDataJsonString;
    }
  } else {
    type = DataTypeEnum.TEXT;
    data = {
      data: String(output),
      type,
    };
  }

  return {
    data,
    type,
  };
}

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
      let outputsFinal = [];
      let multiOutput = false;
      let outputType;

      outputs.forEach((output: OutputType) => {
        const {
          data,
          type,
        } = prepareOutput(output);

        multiOutput = multiOutput || output?.multi_output;
        outputType = (!data && !outputType && outputs?.length >= 2) ? null : (outputType || type);

        if (!!data || outputs?.length === 1) {
          outputsFinal.push({
            data,
            type,
          });
        }
      });

      if (multiOutput) {
        outputsFinal = [
          {
            data: {
              columns: outputs?.map((output, idx) => output?.variable_uuid || `output_${idx}`),
              index: outputs?.map((o, i) => i),
              shape: [outputs?.length || 0, 1],
              rows: outputsFinal,
            },
            type: outputType,
            multi_output: true,
          },
        ];
        // This is to display reduce output data
      } else if (DataTypeEnum.TABLE === outputType && outputsFinal?.length >= 2 && !!outputsFinal?.[0]?.data?.text_data) {
        const rows = outputsFinal?.map(({ data }) => data);
        if (rows?.length >= 1) {
          const columns = range(Math.max(...rows?.map(row => row?.length)))?.map((_, idx) => `col${idx}`);
          const shape = [rows?.length, columns?.length];
          const index = rows?.map((_, idx) => idx);
          outputsFinal = [
            {
              data: {
                rows,
                columns,
                shape,
                index,
              },
              type: outputType,
            },
          ];
        }
      }

      messagesInit[uuid] = outputsFinal;
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
    displayRelative?: boolean;
    isPipelineUpdating?: boolean;
    pipelineContentTouched?: boolean;
    pipelineLastSaved?: number;
    showLastUpdatedTimestamp?: number;
  },
): string {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const isPipelineUpdating = opts?.isPipelineUpdating;
  const pipelineContentTouched = opts?.pipelineContentTouched;
  const pipelineLastSaved = opts?.pipelineLastSaved;

  let saveStatus;
  if (pipelineContentTouched) {
    saveStatus = 'Unsaved changes';
  } else if (isPipelineUpdating) {
    saveStatus = 'Saving changes...';
  } else if (pipelineLastSaved) {
    const now = moment().utc().unix();
    if (opts?.displayRelative && now - pipelineLastSaved < 60 * 60) {
      const ago = moment.unix(now - (now - pipelineLastSaved)).utc().fromNow();
      saveStatus = `Saved ${ago}`;
    } else {
      let lastSavedDate = dateFormatLongFromUnixTimestamp(pipelineLastSaved / 1000);

      if (pipeline?.updated_at) {
        lastSavedDate = datetimeInLocalTimezone(
          dateFormatLong(pipeline?.updated_at, { includeSeconds: true, utcFormat: true }),
          displayLocalTimezone,
        );
      }
      saveStatus = `Last saved ${lastSavedDate}`;
    }
  } else if (opts?.showLastUpdatedTimestamp) {
    const lastSavedDate = momentInLocalTimezone(moment(opts?.showLastUpdatedTimestamp), displayLocalTimezone);
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

export function buildBlockFromFilePath({
  blockIndex,
  blocks,
  filePath,
  isNewBlock,
  name,
  repoPathRelativeRoot,
}: {
  blockIndex?: number;
  blocks: BlockType[];
  filePath: string;
  isNewBlock?: boolean;
  name?: string;
  repoPathRelativeRoot: string;
}) {
  // filePath: default_repo/dbt/demo/models/example/model_1.sql
  // finalFilePath: demo/models/example/model_1.sql
  const projectPath =
    `${repoPathRelativeRoot}${osPath.sep}${BlockFolderNameEnum.DBT}${osPath.sep}`;
  // let finalFilePath = filePath;

  // Only remove the project name and dbt folder from the file path if its in the current
  // active project’s directory.
  // if (finalFilePath?.startsWith(projectPath)) {
  //   finalFilePath = finalFilePath?.replace(projectPath, '');
  // }

  if (isNewBlock) {
    let blockName = addUnderscores(name || randomNameGenerator());
    const sqlExtension = `.${FileExtensionEnum.SQL}`;
    if (blockName.endsWith(sqlExtension)) {
      blockName = blockName.slice(0, -4);
    }
    // finalFilePath: demo/models/example/model_1.sql
    // finalFilePath = `${filePath}${osPath.sep}${blockName}.${FileExtensionEnum.SQL}`;
  }

  const newBlock: BlockRequestPayloadType = {
    configuration: {
      file_path: filePath,
      file_source: {
        path: filePath,
      },
      limit: DEFAULT_SQL_CONFIG_KEY_LIMIT,
    },
    language: BlockLanguageEnum.SQL,
    name: removeExtensionFromFilename(filePath),
    type: BlockTypeEnum.DBT,
    // Used in project platform
  };

  if (isNewBlock) {
    newBlock.content = `--Docs: https://docs.mage.ai/dbt/sources
`;
  }

  const isAddingFromBlock =
    typeof blockIndex === 'undefined' || blockIndex === null;
  const block = blocks[isAddingFromBlock ? blocks.length - 1 : blockIndex];
  const upstreamBlocks = block ? getUpstreamBlockUuids(block, newBlock) : [];

  return {
    ...newBlock,
    upstream_blocks: upstreamBlocks,
  };
}
