import { useEffect, useRef, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import ErrorPopup from '@components/ErrorPopup';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import Head from '@oracle/elements/Head';
import Header, { BreadcrumbType, MenuItemType } from '@components/shared/Header';
import Subheader from './Subheader';
import TripleLayout from '@components/TripleLayout';
import VerticalNavigation, { VerticalNavigationProps } from './VerticalNavigation';
import api from '@api';
import usePrevious from '@utils/usePrevious';
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
import { useWindowSize } from '@utils/sizes';

export type DashboardSharedProps = {
  after?: any;
  afterHidden?: boolean;
  afterWidth?: number;
  afterWidthOverride?: boolean;
  before?: any;
  beforeWidth?: number;
  uuid: string;
};

type DashboardProps = {
  addProjectBreadcrumbToCustomBreadcrumbs?: boolean;
  breadcrumbs?: BreadcrumbType[];
  children?: any;
  errors?: ErrorsType;
  headerMenuItems?: MenuItemType[];
  headerOffset?: number;
  mainContainerHeader?: any;
  setErrors?: (errors: ErrorsType) => void;
  subheaderChildren?: any;
  title: string;
} & DashboardSharedProps;

function Dashboard({
  addProjectBreadcrumbToCustomBreadcrumbs,
  after,
  afterHidden,
  afterWidth: afterWidthProp,
  afterWidthOverride,
  before,
  beforeWidth: beforeWidthProp,
  breadcrumbs: breadcrumbsProp,
  children,
  errors,
  headerMenuItems,
  headerOffset,
  mainContainerHeader,
  navigationItems,
  setErrors,
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
  const [afterWidth, setAfterWidth] = useState(afterWidthOverride
    ? afterWidthProp
    : get(localStorageKeyAfter, afterWidthProp),
  );
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(before
    ? Math.max(
      get(localStorageKeyBefore, beforeWidthProp),
      UNIT * 13,
    )
    : null,
  );
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);
  const [, setMainContainerWidth] = useState<number>(null);

  const { data: dataProjects } = api.projects.list({}, { revalidateOnFocus: false });
  const projects = dataProjects?.projects;

  const breadcrumbProject = {
    label: () => projects?.[0]?.name,
    linkProps: {
      href: '/',
    },
  };
  const breadcrumbs = [];
  if (breadcrumbsProp) {
    if (addProjectBreadcrumbToCustomBreadcrumbs) {
      breadcrumbs.push(breadcrumbProject);
    }

    breadcrumbs.push(...breadcrumbsProp);
  } else if (projects?.length >= 1) {
    breadcrumbs.push(...[
      breadcrumbProject,
      {
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
    mainContainerRef,
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
    localStorageKeyAfter,
  ]);

  useEffect(() => {
    if (!beforeMousedownActive) {
      set(localStorageKeyBefore, beforeWidth);
    }
  }, [
    beforeMousedownActive,
    beforeWidth,
    localStorageKeyBefore,
  ]);

  const afterWidthPropPrev = usePrevious(afterWidthProp);
  useEffect(() => {
    if (afterWidthOverride && afterWidthPropPrev !== afterWidthProp) {
      setAfterWidth(afterWidthProp);
    }
  }, [
    afterWidthOverride,
    afterWidthProp,
    afterWidthPropPrev,
  ]);

  return (
    <>
      <Head title={title} />

      <Header
        breadcrumbs={breadcrumbs}
        menuItems={headerMenuItems}
        project={projects?.[0]}
        version={projects?.[0]?.version}
      />

      <ContainerStyle>
        {navigationItems?.length !== 0 && (
          <VerticalNavigationStyle showMore>
            <VerticalNavigation
              navigationItems={navigationItems}
              showMore
            />
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
            headerOffset={headerOffset}
            hideAfterCompletely
            leftOffset={before ? VERTICAL_NAVIGATION_WIDTH : null}
            mainContainerHeader={mainContainerHeader}
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

      {errors && (
        <ClickOutside
          disableClickOutside
          isOpen
          onClickOutside={() => setErrors?.(null)}
        >
          <ErrorPopup
            {...errors}
            onClose={() => setErrors?.(null)}
          />
        </ClickOutside>
      )}
    </>
  );
}

export default Dashboard;
