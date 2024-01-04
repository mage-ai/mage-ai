import React, { createRef, useMemo, useRef } from 'react';
import { useMutation } from 'react-query';

import CodeEditor from '@components/CodeEditor';
import { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import { getFilenameFromFilePath } from '@components/Files/utils';
import api from '@api';
import { onSuccess } from '@api/utils/response';

function VersionControlFileDiffs({
  applicationConfigration,
}) {
  const refContent = useRef({});

  const {
    item
  } = applicationConfigration;

  const { data, fetch } = api.version_control_files.version_control_projects.list(
    encodeURIComponent(item?.metadata?.project?.uuid),
    {
      diff: true,
    });
  const files = useMemo(() => data?.version_control_files || [], [data]);

  const [updateFile] = useMutation(
    ({
      filePath,
      content,
    }) => api.file_contents.useUpdate(encodeURIComponent(filePath))({
      file_content: {
        content,
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          // callback: () => {
          // },
          // onErrorCallback: (response, errors) => setErrors?.({
          //   errors,
          //   response,
          // }),
        },
      ),
    },
  );

  const codeEditors = useMemo(() => {
    return (
      <>
        {files?.map(({
          content,
          diff,
          file_path: filePath,
          name,
          project_uuid,
          repo_path,
          staged,
          unstaged,
          untracked,
        }) => {
          const fileExtension = getFilenameFromFilePath(name)?.split('.')?.pop();
          const ref = refContent?.[name] || createRef();
          refContent.current[name] = ref;

          return (
            <CodeEditor
              autoHeight
              // height={codeEditorMaximumHeightOffset ? heightTotal - codeEditorMaximumHeightOffset : null}
              language={FILE_EXTENSION_TO_LANGUAGE_MAPPING[fileExtension]}
              onChange={(value: string) => {
                refContent.current[name] = value;
              }}
              onSave={(content: string) => {
                updateFile({
                  filePath,
                  content,
                });
              }}
              originalValue={Array.isArray(diff) ? diff?.join('\n') : diff}
              padding={10}
              readOnly={false}
              showDiffs
              value={content}
              width="100%"
            />
          );
        })}
      </>
    );
  }, [files]);

  return (
    <div ref={ref}>
      {codeEditors}
    </div>
  );
}

export default React.forwardRef(VersionControlFileDiffs);
