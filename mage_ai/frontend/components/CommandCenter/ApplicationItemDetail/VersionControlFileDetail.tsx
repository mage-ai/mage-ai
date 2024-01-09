import * as osPath from 'path';
import { useMemo } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import VersionControlFileBrowser from './VersionControlFileBrowser';
import { ChildrenStyle, ContainerStyle, FormStyle } from '../ApplicationForm/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { VersionControlFileType } from '@interfaces/VersionControlType';
import { pluralize } from '@utils/string';
import { sortByKey } from '@utils/array';

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
    const staged2: VersionControlFileType[] = [];
    const unstaged2: VersionControlFileType[] = [];
    const untracked2: VersionControlFileType[] = [];

    const files2: VersionControlFileType[] = model?.version_control_files || [];
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
    sortByKey([
      [`${pluralize('file', staged?.length)} ready to commit`, staged],
      [pluralize('modified file', unstaged?.length), unstaged],
      [pluralize('new file', untracked?.length), untracked],
    ], tup => tup[1]).forEach(([title, arr]) => {
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
        <VersionControlFileBrowser
          files={model?.files}
          mapping={mapping}
        />
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
          showDividers
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
