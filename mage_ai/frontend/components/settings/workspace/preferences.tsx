import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import VerticalSectionLinks from '@components/VerticalSectionLinks';
import { BEFORE_WIDTH, BeforeStyle } from '@components/PipelineDetail/shared/index.style';

function SettingsListPage() {
  return (
    <Dashboard
      // afterHidden
      before={(
        <BeforeStyle>
          <VerticalSectionLinks
            sections={[
              {
                items: [
                  {
                    linkProps: {
                      href: '/settings/workspace/preferences',
                    },
                    uuid: 'Preferences',
                  },
                  {
                    linkProps: {
                      href: '/settings/workspace/users',
                    },
                    uuid: 'Users',
                  },
                ],
                uuid: 'Workspace',
              },
              {
                items: [
                  {
                    linkProps: {
                      href: '/settings/account/profile',
                    },
                    uuid: 'Profile',
                  },
                ],
                uuid: 'Account',
              },
            ]}
          />
        </BeforeStyle>
      )}
      beforeWidth={BEFORE_WIDTH}
      // buildSidekick
      title="Settings"
      uuid="settings/index"
    >
    </Dashboard>
  );
}

SettingsListPage.getInitialProps = async () => ({});

export default PrivateRoute(SettingsListPage);
