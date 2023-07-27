
import Col from '@components/shared/Grid/Col';
import Preferences from '@components/settings/workspace/Preferences';
import PrivateRoute from '@components/shared/PrivateRoute';
import Row from '@components/shared/Grid/Row';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  SECTION_ITEM_UUID_PREFERENCES,
  SECTION_UUID_WORKSPACE,
} from '@components/settings/Dashboard/constants';

function PreferencesPage() {
  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_PREFERENCES}
      uuidWorkspaceSelected={SECTION_UUID_WORKSPACE}
    >
      <Spacing p={PADDING_UNITS}>
        <Row justifyContent="center">
          <Col
            xl={8}
            xxl={6}
          >
            <Preferences />
          </Col>
        </Row>
      </Spacing>
    </SettingsDashboard>
  );
}

PreferencesPage.getInitialProps = async () => ({});

export default PrivateRoute(PreferencesPage);
