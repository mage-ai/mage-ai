import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';

import {
  SECTION_ITEM_UUID_USERS,
  SECTION_UUID_WORKSPACE,
} from '@components/settings/Dashboard/constants';

function UsersListPage() {
  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_USERS}
      uuidWorkspaceSelected={SECTION_UUID_WORKSPACE}
    >

    </SettingsDashboard>
  );
}

UsersListPage.getInitialProps = async () => ({});

export default PrivateRoute(UsersListPage);
