import { useEffect, useRef, useState } from 'react';

import Flex from '@oracle/components/Flex';
import Head from '@oracle/elements/Head';
import Header, { BreadcrumbType } from '@components/shared/Header';
import ProjectType from '@interfaces/ProjectType';
import Subheader from './Subheader';
import TripleLayout from '@components/TripleLayout';
import VerticalNavigation, { VerticalNavigationProps } from './VerticalNavigation';
import api from '@api';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import {
  ContainerStyle,
  VERTICAL_NAVIGATION_WIDTH,
  VerticalNavigationStyle,
} from './index.style';

type DashboardProps = {
  breadcrumbs?: BreadcrumbType[];
  children?: any;
  subheaderChildren?: any;
  title: string;
};

function Dashboard({
  breadcrumbs: breadcrumbsProp,
  children,
  navigationItems,
  subheaderChildren,
  title,
}: DashboardProps & VerticalNavigationProps) {
  const refSubheader = useRef(null);
  const [headerOffset, setHeaderOffset] = useState<number>(null);

  const { data: dataProjects } = api.projects.list();
  const projects = dataProjects?.projects;

  const breadcrumbs = [];
  if (breadcrumbsProp) {
    breadcrumbs.push(...breadcrumbsProp);
  } else if (projects?.length >= 1) {
    breadcrumbs.push(...[
      {
        label: () => projects[0]?.name,
      },
      {
        gradientColor: PURPLE_BLUE,
        label: () => title,
      },
    ]);
  }

  useEffect(() => {
    const height = refSubheader?.current?.getBoundingClientRect?.()?.height;
    setHeaderOffset(height || 0);
  }, []);

  return (
    <>
      <Head title={title} />

      <Header
        breadcrumbs={breadcrumbs}
        version={projects?.[0]?.version}
      />

      <ContainerStyle>
        <VerticalNavigationStyle>
          <VerticalNavigation navigationItems={navigationItems} />
        </VerticalNavigationStyle>

        <Flex
          flex={1}
          flexDirection="column"
        >
          {subheaderChildren && (
            <Subheader ref={refSubheader}>
              {subheaderChildren}
            </Subheader>
          )}

          {headerOffset !== null && (
            // @ts-ignore
            <TripleLayout
              after={
                <h1>
                  HEY
                </h1>
              }
              // afterHeader={afterHeader}
              afterHidden={false}
              // afterMousedownActive={afterMousedownActive}
              // afterSubheader={afterSubheader}
              // afterWidth={afterWidth}
              // before={before}
              // beforeHeader={beforeHeader}
              // beforeHidden={beforeHidden}
              // beforeMousedownActive={beforeMousedownActive}
              beforeWidth={VERTICAL_NAVIGATION_WIDTH}
              // header={headerMemo}
              headerOffset={headerOffset}
              // mainContainerHeader={mainContainerHeader}
              // mainContainerRef={mainContainerRef}
              // setAfterHidden={setAfterHidden}
              // setAfterMousedownActive={setAfterMousedownActive}
              // setAfterWidth={setAfterWidth}
              // setBeforeHidden={setBeforeHidden}
              // setBeforeMousedownActive={setBeforeMousedownActive}
              // setBeforeWidth={setBeforeWidth}
            >
              {children}
            </TripleLayout>
          )}
        </Flex>
      </ContainerStyle>
    </>
  );
}

export default Dashboard;
