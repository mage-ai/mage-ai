import Dashboard from '@components/Dashboard';
import VerticalSectionLinks from '@components/VerticalSectionLinks';
import { BEFORE_WIDTH, BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { SECTIONS } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { getUser } from '@utils/session';

type SettingsDashboardProps = {
  after?: any;
  afterHidden?: boolean;
  children: any;
  uuidItemSelected: string;
  uuidWorkspaceSelected: string;
};

function SettingsDashboard({
  after,
  afterHidden,
  children,
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
      title="Settings"
      uuid="settings/index"
    >
      {children}
    </Dashboard>
  );
}

export default SettingsDashboard;
