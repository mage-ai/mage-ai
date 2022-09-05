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
import { UNIT } from '@oracle/styles/units/spacing';
import {
  get,
  set,
} from '@storage/localStorage';
import { removeUnderscore } from '@utils/string';
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
  const refSubheader = useRef(null);

  const [afterWidth, setAfterWidth] = useState(get(localStorageKeyAfter, afterWidthProp));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(get(localStorageKeyBefore, beforeWidthProp));
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);
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
        // gradientColor: PURPLE_BLUE,
        bold: true,
        label: () => title,
      },
    ]);
  }

  useEffect(() => {
    const height = refSubheader?.current?.getBoundingClientRect?.()?.height;
    setHeaderOffset(height || 0);
  }, []);

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
              afterHidden={afterHidden}
              afterMousedownActive={afterMousedownActive}
              afterWidth={afterWidth}
              before={before}
              beforeHeightOffset={HEADER_HEIGHT}
              beforeMousedownActive={beforeMousedownActive}
              beforeWidth={VERTICAL_NAVIGATION_WIDTH + (before ? beforeWidth : 0)}
              headerOffset={headerOffset}
              hideAfterCompletely
              leftOffset={before ? VERTICAL_NAVIGATION_WIDTH : null}
              mainContainerRef={mainContainerRef}
              setAfterMousedownActive={setAfterMousedownActive}
              setAfterWidth={setAfterWidth}
              setBeforeMousedownActive={setBeforeMousedownActive}
              setBeforeWidth={setBeforeWidth}
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
