import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';

import {
  SECTION_ITEM_UUID_PROFILE,
  SECTION_UUID_ACCOUNT,
} from '@components/settings/Dashboard/constants';

function ProfilePage() {
  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_PROFILE}
      uuidWorkspaceSelected={SECTION_UUID_ACCOUNT}
    >

    </SettingsDashboard>
  );
}

ProfilePage.getInitialProps = async () => ({});

export default PrivateRoute(ProfilePage);
