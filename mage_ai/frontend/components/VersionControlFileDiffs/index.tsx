import { createRef, useMemo, useRef } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import CodeEditor from '@components/CodeEditor';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import api from '@api';
import { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getFilenameFromFilePath } from '@components/Files/utils';
import { range } from '@utils/array';
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
      <Accordion
        noBorder
        noBoxShadow
      >
        {files?.map(({
          additions,
          content,
          deletions,
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
            <AccordionPanel
              key={filePath}
              noBorderRadius
              noPaddingContent
              title={(
                <FlexContainer
                  alignItems="center"
                  fullWidth
                  justifyContent="space-between"
                  title={`+${additions} -${deletions}`}
                >
                  <Flex flex={1}>
                    <Text monospace small>
                      {filePath}
                    </Text>
                  </Flex>

                  {additions !== null && deletions !== null && (
                    <FlexContainer alignItems="center" justifyContent="flex-end">
                      {range(additions)?.map((_, idx) => (
                        <Text key={`addition-${idx}`} monospace success xsmall>+</Text>
                      ))}
                      {range(deletions)?.map((_, idx) => (
                        <Text key={`deletion-${idx}`} monospace danger xsmall>-</Text>
                      ))}
                    </FlexContainer>
                  )}
                </FlexContainer>
              )}
              titleXPadding={UNIT * 1}
              titleYPadding={UNIT * 1}
              unboundedTitle
            >
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
            </AccordionPanel>
          );
        })}
      </Accordion>
    );
  }, [files]);

  return (
    <div>
      {codeEditors}
    </div>
  );
}

export default VersionControlFileDiffs;
