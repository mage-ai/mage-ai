import * as osPath from 'path';

import FileType, {
  ALL_SUPPORTED_FILE_EXTENSIONS_REGEX,
  FileExtensionEnum,
} from '@interfaces/FileType';
import { BlockTypeEnum } from '@interfaces/BlockType';
import StatusType from '@interfaces/StatusType';

export function convertFilePathToRelativeRoot(filePath: string, status: StatusType): string {
  // {
  //   "disable_pipeline_edit_access": false,
  //   "instance_type": null,
  //   "is_instance_manager": false,
  //   "max_print_output_lines": 1000,
  //   "project_type": null,
  //   "project_uuid": "efd118eb356b48cbb190df56806d118a",
  //   "repo_path": "/home/src/default_repo/default_platform/platform/fire",
  //   "repo_path_relative": "fire",
  //   "repo_path_relative_root": "fire",
  //   "repo_path_root": "/home/src/default_repo/default_platform/platform/fire",
  //   "require_user_authentication": true,
  //   "require_user_permissions": false,
  //   "scheduler_status": "running"
  // }

  const { repo_path_root: repoPathRoot, repo_path_relative_root: repoPathRelativeRoot } =
    status || {
      repo_path_root: null,
      repo_path_relative_root: null,
    };

  let fp = filePath;

  if (filePath?.startsWith(repoPathRoot)) {
    fp = filePath?.replace(repoPathRoot, repoPathRelativeRoot);
  } else if (!filePath?.startsWith(repoPathRelativeRoot)) {
    fp = [repoPathRelativeRoot, filePath].join(osPath.sep);
  }

  if (fp?.startsWith(osPath.sep)) {
    fp = fp?.slice(1);
  }

  return fp;
}

export function addRepoPath(filePath: string, status: StatusType): string {
  const { repo_path_root: repoPathRoot, repo_path_relative_root: repoPathRelativeRoot } =
    status || {
      repo_path_root: null,
      repo_path_relative_root: null,
    };

  if (filePath?.startsWith(repoPathRelativeRoot)) {
    return [repoPathRoot, filePath?.split(osPath.sep)?.slice(1)?.join(osPath.sep)].join(osPath.sep);
  }

  return filePath;
}

export function getFullPath(
  file: FileType,
  currentPathInit: string = null,
  removeFilename: boolean = false,
): string {
  const currentPath = currentPathInit || (removeFilename ? null : file?.name);

  if (file?.parent) {
    const parts = [file.parent.name];
    if (currentPath?.length >= 1) {
      parts.push(currentPath);
    }
    return getFullPath(file.parent, parts.join(osPath.sep));
  } else if (file?.path) {
    return file?.path;
  }

  return currentPath;
}

export function removeFileExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

export function getFileExtension(filename: string): FileExtensionEnum {
  const match = filename?.match(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX);
  return match?.length >= 1 ? (match[0].replace('.', '') as FileExtensionEnum) : null;
}

export function validBlockFileExtension(filename: string): string {
  const extensions = [
    `\\.${FileExtensionEnum.MD}`,
    `\\.${FileExtensionEnum.PY}`,
    `\\.${FileExtensionEnum.R}`,
    `\\.${FileExtensionEnum.SQL}`,
    `\\.${FileExtensionEnum.YAML}`,
    `\\.${FileExtensionEnum.YML}`,
  ].join('|');
  const extensionRegex = new RegExp(`${extensions}$`);

  const match = filename.match(extensionRegex);

  return match?.length >= 1 ? match[0].replace('.', '') : null;
}

export function validBlockFromFilename(filename: string, blockType: BlockTypeEnum): boolean {
  const fileExtension = validBlockFileExtension(filename);

  return (
    !['__init__.py'].includes(filename) &&
    (BlockTypeEnum.DBT !== blockType ||
      ![
        FileExtensionEnum.YAML,
        FileExtensionEnum.YML,
        // @ts-ignore
      ].includes(fileExtension))
  );
}

export function getFullPathWithoutRootFolder(
  file: FileType,
  currentPathInit: string = null,
  removeFilename: boolean = false,
): string {
  const fullPath = getFullPath(file, currentPathInit, removeFilename);

  return removeRootFromFilePath(fullPath);
}

export function removeRootFromFilePath(filePath: string): string {
  return filePath?.split(osPath.sep).slice(1).join(osPath.sep);
}
