import Dashboard from '@components/Dashboard';
import VerticalSectionLinks from '@components/VerticalSectionLinks';
import { BEFORE_WIDTH, BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { SECTIONS } from './constants';

type SettingsDashboardProps = {
  children: any;
  uuidItemSelected: string;
  uuidWorkspaceSelected: string;
};

function SettingsDashboard({
  children,
  uuidItemSelected,
  uuidWorkspaceSelected,
}: SettingsDashboardProps) {
  return (
    <Dashboard
      // afterHidden
      before={(
        <BeforeStyle>
          <VerticalSectionLinks
            isItemSelected={({
              uuid,
              uuidWorkspace,
            }) => uuidWorkspaceSelected === uuidWorkspace && uuidItemSelected === uuid}
            sections={SECTIONS}
          />
        </BeforeStyle>
      )}
      beforeWidth={BEFORE_WIDTH}
      // buildSidekick
      title="Settings"
      uuid="settings/index"
    >
      {children}
    </Dashboard>
  );
}

export default SettingsDashboard;
