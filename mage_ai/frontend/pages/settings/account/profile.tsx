import UserDetail, { ObjectTypeEnum } from '@components/users/UserDetail';
import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';
import useGetUser from '@utils/hooks/useGetUser';
import {
  SECTION_ITEM_UUID_PROFILE,
  SECTION_UUID_ACCOUNT,
} from '@components/settings/Dashboard/constants';

function ProfilePage() {
  const { id } = useGetUser() || {};

  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_PROFILE}
      uuidWorkspaceSelected={SECTION_UUID_ACCOUNT}
    >
      <UserDetail
        contained
        disableFields={[ObjectTypeEnum.PERMISSIONS, ObjectTypeEnum.ROLES]}
        slug={id}
      />
    </SettingsDashboard>
  );
}

ProfilePage.getInitialProps = async () => ({});

export default PrivateRoute(ProfilePage);
