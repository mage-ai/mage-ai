import Panel from '@oracle/components/Panel';
import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import UserEditForm from '@components/users/edit/Form';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  SECTION_ITEM_UUID_PROFILE,
  SECTION_UUID_ACCOUNT,
} from '@components/settings/Dashboard/constants';
import { getUser } from '@utils/session';

function ProfilePage() {
  const { id } = getUser() || {};
  const { data, mutate: fetchUser } = api.users.detail(id);
  const user = data?.user;

  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_PROFILE}
      uuidWorkspaceSelected={SECTION_UUID_ACCOUNT}
    >
      <Spacing p={PADDING_UNITS}>
        <Panel>
          <UserEditForm
            disabledFields={['roles']}
            onSaveSuccess={fetchUser}
            user={user}
          />
        </Panel>
      </Spacing>
    </SettingsDashboard>
  );
}

ProfilePage.getInitialProps = async () => ({});

export default PrivateRoute(ProfilePage);
