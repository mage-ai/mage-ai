import Dashboard from '@components/Dashboard';
import VerticalSectionLinks from '@components/VerticalSectionLinks';
import { BEFORE_WIDTH, BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { BreadcrumbType } from '@components/shared/Header';
import { SECTIONS } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { getUser } from '@utils/session';

type SettingsDashboardProps = {
  after?: any;
  afterHidden?: boolean;
  appendBreadcrumbs?: boolean;
  breadcrumbs?: BreadcrumbType[];
  children: any;
  title?: string;
  uuidItemSelected: string;
  uuidWorkspaceSelected: string;
};

function SettingsDashboard({
  after,
  afterHidden,
  appendBreadcrumbs,
  breadcrumbs,
  children,
  title,
  uuidItemSelected,
  uuidWorkspaceSelected,
}: SettingsDashboardProps) {
  const user = getUser() || {};

  return (
    <Dashboard
      after={after}
      afterHidden={!after || afterHidden}
      afterWidth={after ? 50 * UNIT : 0}
      afterWidthOverride
      appendBreadcrumbs={appendBreadcrumbs}
      before={(
        <BeforeStyle>
          <VerticalSectionLinks
            isItemSelected={({
              uuid,
              uuidWorkspace,
            }) => uuidWorkspaceSelected === uuidWorkspace && uuidItemSelected === uuid}
            sections={SECTIONS(user)}
          />
        </BeforeStyle>
      )}
      beforeWidth={BEFORE_WIDTH}
      breadcrumbs={breadcrumbs}
      title={title || 'Settings'}
      uuid={`${title || 'settings'}/index`}
    >
      {children}
    </Dashboard>
  );
}

export default SettingsDashboard;
