import { createRef, useCallback, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Checkbox from '@oracle/elements/Checkbox';
import CodeEditor from '@components/CodeEditor';
import FileNavigation from './FileNavigation';
import FileType, { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import TripleLayout from '@components/TripleLayout';
import VersionControlFileBrowser, {
  buildMapping,
} from '@components/CommandCenter/ApplicationItemDetail//VersionControlFileBrowser';
import api from '@api';
import useApplicationBase, { ApplicationBaseType } from '@components/Applications/useApplicationBase';
import { AlertTriangle, Check, IntegrationPipeline } from '@oracle/icons';
import { ApplicationConfiguration } from '@components/CommandCenter/constants';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { ContainerStyle } from './index.style';
import { KeyValueType } from '@interfaces/CommandCenterType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { VersionControlFileType } from '@interfaces/VersionControlType';
import { getApplicationColors } from '@components/ApplicationManager/index.style';
import { getFilenameFromFilePath } from '@components/Files/utils';
import { onSuccess } from '@api/utils/response';
import { range, sortByKey } from '@utils/array';

function VersionControlFileDiffs({
  applicationConfiguration,
  applicationState,
  onChangeState,
  uuid,
  ...props
}: {
  applicationConfiguration: ApplicationConfiguration;
  applicationState: {
    current: KeyValueType | {
      files?: FileType[];
    };
  };
  onChangeState?: (prev: (data: any) => any) => any;
} & ApplicationBaseType) {
  useApplicationBase({
    ...props,
    uuid,
  });

  const refContent = useRef({});
  const refRows = useRef([]);

  const [beforeWidth, setBeforeWidth] = useState(40 * UNIT);
  const [selectedFiles, setSelectedFilesState] = useState<KeyValueType>(
    applicationState?.current?.[uuid]?.files || {},
  );
  const setSelectedFiles = useCallback((prev: (data: any) => any) => {
    setSelectedFilesState((prev2) => {
      const value = prev(prev2);

      onChangeState?.((state) => ({
        ...state,
        [uuid]: {
          ...state?.[uuid],
          files: value,
        },
      }));

      return value;
    });

  }, [onChangeState, uuid]);

  const tabs = useMemo(() => {
    const count = Object.values(selectedFiles || {}).filter(v => v)?.length;

    return [
      {
        label: () => count >= 1 ? `Files selected ${count}` : 'Files changed',
        uuid: 'Files changed',
      },
      {
        uuid: 'All files in repository',
      },
    ];
  }, [selectedFiles]);
  const [selectedTab, setSelectedTab] = useState<TabType>(tabs?.[0]);

  const {
    item
  } = applicationConfiguration;

  const { data, fetch } = api.version_control_files.version_control_projects.list(
    encodeURIComponent(item?.metadata?.project?.uuid),
    {
      diff: true,
    });
  const files: VersionControlFileType[] = useMemo(() => sortByKey(
    data?.version_control_files || [],
    ({ name }) => name,
  ) || [], [data]);

  const { data: dataFilesBrowser } = api.files.list({
    repo_path: item?.metadata?.project?.repo_path,
  });
  const filesBrowser: FileType[] = useMemo(() => dataFilesBrowser?.files || [], [data]);

  const [updateFile] = useMutation(
    ({
      filePath,
      content,
    }: {
      filePath: string;
      content: string;
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
              beforeTitleElement={(
                <FlexContainer alignItems="center">
                  {staged && !unstaged && <Check success />}
                  {unstaged && <IntegrationPipeline warning />}
                  {untracked && <AlertTriangle danger />}

                  <div style={{ paddingRight: 1.5 * UNIT }} />
                </FlexContainer>
              )}
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

  const mapping = useMemo(() => buildMapping(files), [files]);

  const beforeMemo = useMemo(() => {
    return (
      <div style={{ padding: UNIT }}>
        {'All files in repository' === selectedTab?.uuid && (
          <VersionControlFileBrowser
            files={filesBrowser}
            mapping={mapping}
          />
        )}

        {('Files changed' === selectedTab?.uuid || !selectedTab?.uuid) && (
          <>
            <FileNavigation
              files={files}
              refRows={refRows}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
            />

            {!files?.length && (
              <div style={{ padding: UNIT }}>
                <Text default>
                  No changes have been made since the last commit.
                </Text>
              </div>
            )}
          </>
        )}
      </div>
    );
  }, [
    files,
    filesBrowser,
    mapping,
    selectedFiles,
    selectedTab,
    setSelectedFiles,
  ]);

  return (
    <ContainerStyle>
      <TripleLayout
        before={beforeMemo}
        beforeHeader={(
          <ButtonTabs
            allowScroll
            onClickTab={(tab: TabType) => {
              setSelectedTab?.(tab);
            }}
            selectedTabUUID={selectedTab?.uuid}
            tabs={tabs}
            underlineStyle
            uppercase={false}
          />
        )}
        beforeHeightOffset={0}
        beforeHeaderOffset={0}
        beforeContentHeightOffset={48}
        beforeHidden={false}
        beforeWidth={300}
        contained
        inline
        noBackground
      >
        {codeEditors}
      </TripleLayout>
    </ContainerStyle>
  );
}

export default VersionControlFileDiffs;
