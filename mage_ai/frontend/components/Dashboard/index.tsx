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
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import {
  get,
  set,
} from '@storage/localStorage';
import { removeUnderscore } from '@utils/string';
import { useWindowSize } from '@utils/sizes';

export type DashboardSharedProps = {
  after?: any;
  afterWidth?: number;
  uuid?: string;
};

type DashboardProps = {
  breadcrumbs?: BreadcrumbType[];
  children?: any;
  subheaderChildren?: any;
  title: string;
} & DashboardSharedProps;

function Dashboard({
  after,
  afterWidth: afterWidthProp = 300,
  breadcrumbs: breadcrumbsProp,
  children,
  navigationItems,
  subheaderChildren,
  title,
  uuid,
}: DashboardProps & VerticalNavigationProps) {
  const {
    width: widthWindow,
  } = useWindowSize();
  const localStorageKey = `dashboard_after_width_${uuid}`;

  const mainContainerRef = useRef(null);
  const refSubheader = useRef(null);

  const [afterWidth, setAfterWidth] = useState(after ? get(localStorageKey, afterWidthProp) : null);
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [headerOffset, setHeaderOffset] = useState<number>(null);
  const [mainContainerWidth, setMainContainerWidth] = useState<number>(null);

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

  useEffect(() => {
    if (mainContainerRef?.current && !afterMousedownActive) {
      setMainContainerWidth?.(mainContainerRef.current.getBoundingClientRect().width);
    }
  }, [
    afterMousedownActive,
    afterWidth,
    mainContainerRef?.current,
    setMainContainerWidth,
    widthWindow,
  ]);

  useEffect(() => {
    if (!afterMousedownActive) {
      set(localStorageKey, afterWidth);
    }
  }, [
    afterMousedownActive,
    afterWidth,
  ]);

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
              after={after}
              afterHeightOffset={HEADER_HEIGHT}
              afterMousedownActive={afterMousedownActive}
              afterWidth={afterWidth}
              beforeWidth={VERTICAL_NAVIGATION_WIDTH}
              headerOffset={headerOffset}
              // mainContainerHeader={mainContainerHeader}
              // mainContainerRef={mainContainerRef}
              setAfterMousedownActive={setAfterMousedownActive}
              setAfterWidth={setAfterWidth}
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
