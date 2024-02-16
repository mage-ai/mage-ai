import * as osPath from 'path';
import BlockType, {
  ADD_ON_BLOCK_TYPES,
  ALL_BLOCK_TYPES,
  ALL_BLOCK_TYPES_WITH_SINGULAR_FOLDERS,
  BlockColorEnum,
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import FileType, {
  FileExtensionEnum,
  FILE_EXTENSION_TO_LANGUAGE_MAPPING,
} from '@interfaces/FileType';
import { find } from '@utils/array';
import { getFullPath } from '@utils/files';
import { removeExtensionFromFilename, singularize } from '@utils/string';
import { selectEntriesWithValues } from '@utils/hash';

export const getBlockFilename = (path: string[]) => path.at(-1);

export const getBlockType = (path: string[]): BlockTypeEnum => {
  let value;

  path?.forEach((part) => {
    if (part?.length >= 1) {
      let part2 = part?.toLowerCase();

      if (part2 in ALL_BLOCK_TYPES_WITH_SINGULAR_FOLDERS) {
        value = part2;
      } else {
        part2 = singularize(part2);
        if (part2 in ALL_BLOCK_TYPES) {
          value = part2;
        }
      }
    }

    if (value) {
      return;
    }
  });

  if (!value) {
    const extensions = [
      `\\.${FileExtensionEnum.SQL}`,
      `\\.${FileExtensionEnum.YAML}`,
      `\\.${FileExtensionEnum.YML}`,
    ].join('|');
    const extensionRegex = new RegExp(`${extensions}$`);
    const fileName = path.join(osPath.sep);

    if (fileName.match(extensionRegex)
      && (path.includes(BlockTypeEnum.DBT) || path.includes('dbts'))) {
      return BlockTypeEnum.DBT;
    }
  }

  return value as BlockTypeEnum;
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
  const blockType = getBlockType(file.path.split(osPath.sep));
  const isDBT = BlockTypeEnum.DBT === blockType;

  let blockUUID = getBlockUUID(parts);
  if (parts.length >= 3 && !isDBT) {
    const idx1 = parts?.findIndex(p => p?.startsWith(blockType));
    const idx2 = parts?.[parts?.length - 1]?.startsWith(blockUUID) ? parts?.length - 1 : parts?.length;
    const nestedFolders = parts?.slice(idx1 + 1, idx2)?.join(osPath.sep);
    if (nestedFolders?.length >= 1) {
      blockUUID = `${nestedFolders}/${blockUUID}`;
    }
  }

  const blockLanguage = FILE_EXTENSION_TO_LANGUAGE_MAPPING[fileExtension];

  const blockReqPayload: BlockRequestPayloadType = {
    configuration: selectEntriesWithValues({
      file_path: (isDBT && BlockLanguageEnum.SQL === blockLanguage) ? getFullPath(file) : null,
      file_source: {
        path: getFullPath(file),
      },
    }),
    language: blockLanguage,
    name: removeExtensionFromFilename(blockUUID),
    type: blockType,
  };

  if (blockType === BlockTypeEnum.CUSTOM) {
    blockReqPayload.color = BlockColorEnum.TEAL;
  }

  if (isIntegrationPipeline && !ADD_ON_BLOCK_TYPES.includes(blockType)) {
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
