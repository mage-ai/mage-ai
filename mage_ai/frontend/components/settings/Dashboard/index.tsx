import Dashboard from '@components/Dashboard';
import VerticalSectionLinks from '@components/VerticalSectionLinks';
import useProject from '@utils/models/project/useProject';
import { BEFORE_WIDTH, BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { BreadcrumbType } from '@components/shared/Header';
import { SECTIONS } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { getUser } from '@utils/session';

type SettingsDashboardProps = {
  after?: any;
  afterHeader?: any;
  afterHidden?: boolean;
  afterWidth?: number;
  appendBreadcrumbs?: boolean;
  breadcrumbs?: BreadcrumbType[];
  children: any;
  hideAfterCompletely?: boolean;
  setAfterHidden?: (value: boolean) => void;
  title?: string;
  uuidItemSelected: string;
  uuidWorkspaceSelected: string;
};

function SettingsDashboard({
  after,
  afterHeader,
  afterHidden,
  afterWidth,
  appendBreadcrumbs,
  breadcrumbs,
  children,
  hideAfterCompletely,
  setAfterHidden,
  title,
  uuidItemSelected,
  uuidWorkspaceSelected,
}: SettingsDashboardProps) {
  const user = getUser() || {};
  const {
    projectPlatformActivated,
  } = useProject();

  return (
    <Dashboard
      after={after}
      afterHeader={afterHeader}
      afterHidden={!after || afterHidden}
      afterWidth={after
        ? afterWidth || 50 * UNIT
        : 0
      }
      afterWidthOverride
      appendBreadcrumbs={appendBreadcrumbs}
      before={(
        <BeforeStyle>
          <VerticalSectionLinks
            isItemSelected={({
              uuid,
              uuidWorkspace,
            }) => uuidWorkspaceSelected === uuidWorkspace && uuidItemSelected === uuid}
            sections={SECTIONS(user, {
              projectPlatformActivated,
            })}
          />
        </BeforeStyle>
      )}
      beforeWidth={BEFORE_WIDTH}
      breadcrumbs={breadcrumbs}
      hideAfterCompletely={hideAfterCompletely}
      setAfterHidden={setAfterHidden}
      title={title || 'Settings'}
      uuid={`${title || 'settings'}/index`}
    >
      {children}
    </Dashboard>
  );
}

export default SettingsDashboard;
