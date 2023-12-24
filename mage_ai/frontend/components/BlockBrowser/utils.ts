import * as osPath from 'path';

import { DBTProjectType } from '@interfaces/CacheItemType';
import { sortByKey } from '@utils/array';

export function buildModels({
  models,
  project,
}: {
  models: string[];
  project: DBTProjectType;
}) {
  const modelPaths = project?.['model-paths'] || [];
  const regexes = new RegExp(modelPaths?.map((modelPath: string) => [
    project?.uuid,
    modelPath,
    '',
  ].join(osPath.sep))?.join('|'));

  return sortByKey((models || [])?.map((filePath: string) => {
    const modelPath = filePath.replace(regexes, '');
    const parts = modelPath?.split(osPath.sep);

    let modelName;
    let modelDirectory;

    if (parts?.length >= 2) {
      modelName = parts?.[parts?.length - 1];
      modelDirectory = parts?.slice(0, parts?.length - 1)?.join(osPath.sep);
    } else {
      modelName = parts?.[0];
    }

    const modelNameParts = modelName?.split('.');
    const fileExtension = modelNameParts?.[modelNameParts?.length - 1];

    return {
      directory: modelDirectory,
      fileExtension,
      filePath: modelPath,
      fullPath: filePath,
      name: modelNameParts?.slice(0, modelNameParts?.length - 1)?.join('.'),
      project,
    };
  }), ({ name }) => name);
}

export function getSelectedItem(cacheItems, selectedLinks) {
  const uuids = selectedLinks?.slice(0, 2)?.map(({ uuid }) => uuid);

  return cacheItems?.find(({
    item,
  }) => uuids?.includes(item?.project?.uuid));
}
