import PrivateRoute from '@components/shared/PrivateRoute';
import Settings from '@components/platform/Settings';
import SettingsDashboard from '@components/settings/Dashboard';
import { SectionItemEnum, SectionEnum } from '@components/settings/Dashboard/constants';

function PlatformSettingsPage() {
  return (
    <SettingsDashboard
      uuidItemSelected={SectionItemEnum.SETTINGS}
      uuidWorkspaceSelected={SectionEnum.PROJECT_PLATFORM}
    >
      <Settings />
    </SettingsDashboard>
  );
}

PlatformSettingsPage.getInitialProps = async () => ({});

export default PrivateRoute(PlatformSettingsPage);
