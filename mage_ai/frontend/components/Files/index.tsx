import Controller from '@components/FileEditor/Controller';
import Dashboard from '@components/Dashboard';
import useFileComponents from '@components/Files/useFileComponents';

import {
  HeaderStyle,
  MAIN_CONTENT_TOP_OFFSET,
  MenuStyle,
  TabsStyle,
} from './index.style';

function FilesPageComponent() {
  const {
    browser,
    controller,
    filePaths,
    menu,
    selectedFilePath,
    tabs,
    versions,
    versionsVisible,
  } = useFileComponents();

  return (
    <Dashboard
      after={versions}
      afterHidden={!(versionsVisible && selectedFilePath)}
      before={browser}
      headerOffset={MAIN_CONTENT_TOP_OFFSET}
      mainContainerHeader={filePaths?.length >= 1 && (
        <HeaderStyle>
          <MenuStyle>
            {menu}
          </MenuStyle>

          <TabsStyle>
            {tabs}
          </TabsStyle>
        </HeaderStyle>
      )}
      title="Files"
      uuid="Files/index"
    >
      {controller}
    </Dashboard>
  );
}

export default FilesPageComponent;
