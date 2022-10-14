import { useEffect, useRef, useState } from 'react';

import Flex from '@oracle/components/Flex';
import Head from '@oracle/elements/Head';
import Header, { BreadcrumbType, MenuItemType } from '@components/shared/Header';
import Subheader from './Subheader';
import TripleLayout from '@components/TripleLayout';
import VerticalNavigation, { VerticalNavigationProps } from './VerticalNavigation';
import api from '@api';
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
import { useWindowSize } from '@utils/sizes';

export type DashboardSharedProps = {
  after?: any;
  afterHidden?: boolean;
  afterWidth?: number;
  before?: any;
  beforeWidth?: number;
  uuid: string;
};

type DashboardProps = {
  breadcrumbs?: BreadcrumbType[];
  children?: any;
  headerMenuItems?: MenuItemType[];
  subheaderChildren?: any;
  title: string;
} & DashboardSharedProps;

function Dashboard({
  after,
  afterHidden,
  afterWidth: afterWidthProp,
  before,
  beforeWidth: beforeWidthProp,
  breadcrumbs: breadcrumbsProp,
  children,
  headerMenuItems,
  navigationItems,
  subheaderChildren,
  title,
  uuid,
}: DashboardProps & VerticalNavigationProps) {
  const {
    width: widthWindow,
  } = useWindowSize();
  const localStorageKeyAfter = `dashboard_after_width_${uuid}`;
  const localStorageKeyBefore = `dashboard_before_width_${uuid}`;

  const mainContainerRef = useRef(null);

  const [afterWidth, setAfterWidth] = useState(get(localStorageKeyAfter, afterWidthProp));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(get(localStorageKeyBefore, beforeWidthProp));
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);
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
        // gradientColor: PURPLE_BLUE,
        bold: true,
        label: () => title,
      },
    ]);
  }

  useEffect(() => {
    if (mainContainerRef?.current && !(afterMousedownActive || beforeMousedownActive)) {
      setMainContainerWidth?.(mainContainerRef.current.getBoundingClientRect().width);
    }
  }, [
    afterMousedownActive,
    afterWidth,
    beforeMousedownActive,
    beforeWidth,
    mainContainerRef?.current,
    setMainContainerWidth,
    widthWindow,
  ]);

  useEffect(() => {
    if (!afterMousedownActive) {
      set(localStorageKeyAfter, afterWidth);
    }
  }, [
    afterHidden,
    afterMousedownActive,
    afterWidth,
  ]);

  useEffect(() => {
    if (!beforeMousedownActive) {
      set(localStorageKeyBefore, beforeWidth);
    }
  }, [
    beforeMousedownActive,
    beforeWidth,
  ]);

  return (
    <>
      <Head title={title} />

      <Header
        breadcrumbs={breadcrumbs}
        menuItems={headerMenuItems}
        version={projects?.[0]?.version}
      />

      <ContainerStyle>
        {navigationItems?.length !== 0 && (
          <VerticalNavigationStyle>
            <VerticalNavigation navigationItems={navigationItems} />
          </VerticalNavigationStyle>
        )}

        <Flex
          flex={1}
          flexDirection="column"
        >
          {/* @ts-ignore */}
          <TripleLayout
            after={after}
            afterHeightOffset={HEADER_HEIGHT}
            afterHidden={afterHidden}
            afterMousedownActive={afterMousedownActive}
            afterWidth={afterWidth}
            before={before}
            beforeHeightOffset={HEADER_HEIGHT}
            beforeMousedownActive={beforeMousedownActive}
            beforeWidth={VERTICAL_NAVIGATION_WIDTH + (before ? beforeWidth : 0)}
            hideAfterCompletely
            leftOffset={before ? VERTICAL_NAVIGATION_WIDTH : null}
            mainContainerRef={mainContainerRef}
            setAfterMousedownActive={setAfterMousedownActive}
            setAfterWidth={setAfterWidth}
            setBeforeMousedownActive={setBeforeMousedownActive}
            setBeforeWidth={setBeforeWidth}
          >
            {subheaderChildren && (
              <Subheader>
                {subheaderChildren}
              </Subheader>
            )}

            {children}
          </TripleLayout>
        </Flex>
      </ContainerStyle>
    </>
  );
}

export default Dashboard;
