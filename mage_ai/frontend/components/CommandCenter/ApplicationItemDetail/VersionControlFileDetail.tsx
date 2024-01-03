import * as osPath from 'path';
import { useMemo } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Folder from '@components/FileBrowser/Folder';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ChildrenStyle, ContainerStyle, FormStyle } from '../ApplicationForm/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { VersionControlFile } from '@interfaces/VersionControlType';
import { pluralize } from '@utils/string';
import { sortByKey } from '@utils/array';
import { getFullPath } from '@utils/files';

function VersionControlFileDetail({
  model,
}) {
  const {
    mapping,
    staged,
    unstaged,
    untracked,
  } = useMemo(() => {
    const mapping2 = {};
    const staged2: VersionControlFile[] = [];
    const unstaged2: VersionControlFile[] = [];
    const untracked2: VersionControlFile[] = [];

    const files2: VersionControlFile[] = model?.version_control_files || [];
    files2?.forEach((file) => {
      if (file?.staged) {
        staged2.push(file);
      } else if (file?.unstaged) {
        unstaged2.push(file);
      } else if (file?.untracked) {
        untracked2.push(file);
      }

      mapping2[[file.project_uuid, file.name].join(osPath.sep)] = file;
    });

    return {
      mapping: mapping2,
      staged: staged2,
      unstaged: unstaged2,
      untracked: untracked2,
    }
  }, [model?.version_control_files]);

  const accordionPanels = useMemo(() => {
    const arr2 = [];
    [
      [`${pluralize('file', staged?.length)} ready to commit`, staged],
      [pluralize('modified file', unstaged?.length), unstaged],
      [pluralize('new file', untracked?.length), untracked],
    ].forEach(([title, arr]) => {
      if (arr?.length) {
        arr2.push(
          <AccordionPanel
            key={title}
            noBorderRadius
            noPaddingContent
            title={(
              <Text default>
                {title}
              </Text>
            )}
            titleXPadding={UNIT * 1}
            titleYPadding={UNIT * 1}
          >
            <div style={{ padding: UNIT * 1 }}>
              {sortByKey(arr, ({ name }) => name)?.map(({
                name,
                staged,
                unstaged,
                untracked,
              }) => (
                <Text
                  danger={untracked}
                  key={name}
                  monospace
                  small
                  success={staged}
                  warning={unstaged}
                >
                  {name}
                </Text>
              ))}
            </div>
          </AccordionPanel>
        );
      }
    });

    return arr2;
  }, [
    staged,
    unstaged,
    untracked,
  ]);

  const filesMemo = useMemo(() => {
    return (
      <div style={{ paddingBottom: 8, paddingTop: 8 }}>
        {model?.files?.map((file, idx) => (
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
                <Spacing mx={1}>
                  <Text
                    {...colorProps}
                    monospace
                    rightAligned
                    small
                  >
                    {displayText}
                  </Text>
                </Spacing>
              );
            }}
          />
        ))}
      </div>
    );
  }, [mapping, model?.files]);

  return (
    <ContainerStyle>
      <ChildrenStyle>
        {filesMemo}
      </ChildrenStyle>

      <FormStyle fullWidth={false}>
        <Accordion
          noBorder
          noBoxShadow
          visibleMappingForced={{
            0: true,
            1: true,
            2: true,
          }}
        >
          {accordionPanels}
        </Accordion>
      </FormStyle>
    </ContainerStyle>
  );
}

export default VersionControlFileDetail;
