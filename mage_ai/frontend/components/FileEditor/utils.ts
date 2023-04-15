import * as osPath from 'path';
import BlockType, {
  BlockColorEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import FileType, {
  FILE_EXTENSION_TO_LANGUAGE_MAPPING,
} from '@interfaces/FileType';
import { find } from '@utils/array';
import { removeExtensionFromFilename } from '@utils/string';

export const getBlockFilename = (path: string[]) => path.at(-1);

export const getBlockType = (path: string[]): BlockTypeEnum => {
  const blockTypeFolder = path[0];

  if (blockTypeFolder === BlockTypeEnum.DBT
    || blockTypeFolder === BlockTypeEnum.CUSTOM) {
    return blockTypeFolder;
  }

  return path[0].slice(0, -1) as BlockTypeEnum;
};

export const getBlockUUID = (path: string[]) => {
  const blockTypeFolder = path[0];

  if (blockTypeFolder === BlockTypeEnum.DBT) {
    return path.slice(1).join(osPath.sep);
  }

  return getBlockFilename(path).split('.')[0];
};

export function buildFileExtensionRegExp() {
  return new RegExp(
    Object
      .keys(FILE_EXTENSION_TO_LANGUAGE_MAPPING)
      .map(ext => `\.(${ext})$`).join('|'),
  );
}

export function buildAddBlockRequestPayload(
  file: FileType,
  repoPath: string,
  pipeline: PipelineType,
): BlockRequestPayloadType {
  const fileExtension = file?.path.match(buildFileExtensionRegExp())[0]?.split('.')[1];
  const isIntegrationPipeline = pipeline.type === PipelineTypeEnum.INTEGRATION;
  const dataExporterBlock: BlockType = find(pipeline?.blocks, ({ type }) => BlockTypeEnum.DATA_EXPORTER === type);

  // Examples:
  // data_loaders/foo.py
  // data_loaders/team/foo.py
  // data_loaders/team/growth/foo.py
  const parts = file.path.replace(repoPath, '').split(osPath.sep);
  const isDBT = file.path.split(osPath.sep)[0] === BlockTypeEnum.DBT;

  let blockUUID = getBlockUUID(parts);
  if (parts.length >= 3 && !isDBT) {
    const nestedFolders = parts.slice(1, parts.length - 1).join(osPath.sep);
    blockUUID = `${nestedFolders}/${blockUUID}`;
  }

  const blockType = getBlockType(file.path.split(osPath.sep));
  const blockReqPayload: BlockRequestPayloadType = {
    configuration: {
      file_path: isDBT ? blockUUID : null,
    },
    language: FILE_EXTENSION_TO_LANGUAGE_MAPPING[fileExtension],
    name: removeExtensionFromFilename(blockUUID),
    type: blockType,
  };

  if (blockType === BlockTypeEnum.CUSTOM) {
    blockReqPayload.color = BlockColorEnum.TEAL;
  }

  if (isIntegrationPipeline) {
    const dataLoaderBlock: BlockType = find(pipeline.blocks, ({ type }) => BlockTypeEnum.DATA_LOADER === type);
    const transformerBlock: BlockType = find(pipeline.blocks, ({ type }) => BlockTypeEnum.TRANSFORMER === type);
    const upstreamBlocks = [];
    if (transformerBlock) {
      upstreamBlocks.push(transformerBlock.uuid);
    } else if (dataExporterBlock?.upstream_blocks) {
      upstreamBlocks.push(...dataExporterBlock.upstream_blocks);
    } else if (dataLoaderBlock) {
      upstreamBlocks.push(dataLoaderBlock.uuid);
    }

    blockReqPayload.upstream_blocks = upstreamBlocks;
  }

  return blockReqPayload;
}
