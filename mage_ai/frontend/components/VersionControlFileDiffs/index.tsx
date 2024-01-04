import { createRef, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import CodeEditor from '@components/CodeEditor';
import FileNavigation from './FileNavigation';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { ContainerStyle } from './index.style';
import { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { VersionControlFileType } from '@interfaces/VersionControlType';
import { getFilenameFromFilePath } from '@components/Files/utils';
import { onSuccess } from '@api/utils/response';
import { range, sortByKey } from '@utils/array';

function VersionControlFileDiffs({
  applicationConfigration,
}) {
  const refContent = useRef({});
  const refRows = useRef([]);

  const [beforeWidth, setBeforeWidth] = useState(40 * UNIT);

  const {
    item
  } = applicationConfigration;

  const { data, fetch } = api.version_control_files.version_control_projects.list(
    encodeURIComponent(item?.metadata?.project?.uuid),
    {
      diff: true,
    });
  const files: VersionControlFileType[] = useMemo(() => sortByKey(
    data?.version_control_files || [],
    ({ name }) => name,
  ) || [], [data]);

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
    const visibleMappingForced = {};

    const el = (
      <Accordion
        noBorder
        noBoxShadow
        showDividers
        visibleMappingForced={visibleMappingForced}
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
        }, idx) => {
          const fileExtension = getFilenameFromFilePath(name)?.split('.')?.pop();

          let ref = refRows?.current?.[idx];
          if (!ref) {
            ref = createRef();
            refRows.current.push(ref);
          }

          if (additions !== null && deletions !== null) {
            const total = (additions || 0) + (deletions || 0);
            if (total >= 2) {
              visibleMappingForced[idx] = true;
            }
          }

          return (
            <AccordionPanel
              key={filePath}
              noBorderRadius
              noPaddingContent
              refContainer={ref}
              title={(
                <FlexContainer
                  alignItems="center"
                  fullWidth
                  justifyContent="space-between"
                  title={`+${additions} -${deletions}`}
                >
                  <Flex flex={1}>
                    <Text
                      danger={untracked}
                      monospace
                      small
                      warning={unstaged}
                    >
                      {filePath?.replace(repo_path, '')?.slice(1)}
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
                language={FILE_EXTENSION_TO_LANGUAGE_MAPPING[fileExtension]}
                onChange={(value: string) => {
                  refContent.current[name] = value;
                }}
                onSave={(content: string) => {
                  // @ts-ignore
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

    return el;
  }, [files]);

  const beforeMemo = useMemo(() => {
    return (
      <>
        <FileNavigation
          files={files}
          refRows={refRows}
        />
      </>
    );
  }, [files]);

  return (
    <ContainerStyle>
      <TripleLayout
        before={beforeMemo}
        beforeHeightOffset={0}
        beforeHidden={false}
        beforeWidth={300}
        contained
        inline
      >
        {codeEditors}
      </TripleLayout>
    </ContainerStyle>
  );
}

export default VersionControlFileDiffs;
