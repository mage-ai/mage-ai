import * as osPath from 'path';

import FileType from '@interfaces/FileType';
import Folder from '@components/FileBrowser/Folder';
import Text from '@oracle/elements/Text';
import { VersionControlFileType } from '@interfaces/VersionControlType';
import { getFullPath } from '@utils/files';

export function buildMapping(files: VersionControlFileType[]) {
  return files?.reduce((acc, file) => ({
    ...acc,
    [[file.project_uuid, file.name].join(osPath.sep)]: file,
  }), {});
}

function VersionControlFileBrowser({
  files,
  mapping,
}: {
  files: FileType[];
  mapping: any;
}) {
  return (
    <>
      {files?.map((file, idx) => (
        <Folder
          disableContextMenu
          file={file}
          key={`${file.name}-${idx}`}
          level={0}
          onlyShowChildren
          renderAfterContent={(file: FileType) => {
            const {
              children,
            } = file;
            const isFolder = children?.length >= 1;

            let fullPath = getFullPath(file);
            // When a folder is untracked, it has a / at the end.
            // e.g. default_repo/transformers/
            if (isFolder) {
              fullPath = `${fullPath}/`;
            }

            let displayText;
            let displayTitle;
            const colorProps: {
              danger?: boolean;
              success?: boolean;
              warning?: boolean;
            } = {};

            const vcFile = mapping?.[fullPath];

            if (vcFile?.unstaged) {
              displayText = 'M';
              displayTitle = 'Modified';
              colorProps.warning = true;
            } else if (vcFile?.untracked) {
              displayText = 'U';
              displayTitle = 'Untracked';
              colorProps.danger = true;
            } else if (vcFile?.staged) {
              displayText = 'S';
              displayTitle = 'Staged';
              colorProps.success = true;
            }

            if (isFolder && !displayText) {
              return null;
            }

            return (
              <div style={{ marginLeft: 8, marginRight: 8 }}>
                <Text
                  {...colorProps}
                  monospace
                  rightAligned
                  small
                >
                  {displayText}
                </Text>
              </div>
            );
          }}
        />
      ))}
    </>
  );
}

export default VersionControlFileBrowser;
