import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import useProject from '@utils/models/project/useProject';
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
  afterHeader?: any;
  afterHidden?: boolean;
  afterWidth?: number;
  afterWidthOverride?: boolean;
  before?: any;
  beforeWidth?: number;
  setAfterHidden?: (value: boolean) => void;
  subheaderNoPadding?: boolean;
  uuid: string;
};

type DashboardProps = {
  addProjectBreadcrumbToCustomBreadcrumbs?: boolean;
  appendBreadcrumbs?: boolean;
  beforeHeader?: any;
  breadcrumbs?: BreadcrumbType[];
  children?: any;
  contained?: boolean;
  errors?: ErrorsType;
  headerMenuItems?: MenuItemType[];
  headerOffset?: number;
  hideAfterCompletely?: boolean;
  mainContainerHeader?: any;
  setAfterWidth?: (value: number) => void;
  setBeforeWidth?: (value: number) => void;
  setErrors?: (errors: ErrorsType) => void;
  subheaderChildren?: any;
  title: string;
} & DashboardSharedProps;

function Dashboard({
  addProjectBreadcrumbToCustomBreadcrumbs,
  after,
  afterHeader,
  afterHidden,
  afterWidth: afterWidthProp,
  afterWidthOverride,
  appendBreadcrumbs,
  before,
  beforeHeader,
  beforeWidth: beforeWidthProp,
  breadcrumbs: breadcrumbsProp,
  children,
  contained,
  errors,
  headerMenuItems,
  headerOffset,
  hideAfterCompletely,
  mainContainerHeader,
  navigationItems,
  setAfterHidden,
  setAfterWidth: setAfterWidthProp,
  setBeforeWidth: setBeforeWidthProp,
  setErrors,
  subheaderChildren,
  subheaderNoPadding,
  title,
  uuid,
}: DashboardProps & VerticalNavigationProps, ref) {
  const {
    width: widthWindow,
  } = useWindowSize();
  const localStorageKeyAfter = `dashboard_after_width_${uuid}`;
  const localStorageKeyBefore = `dashboard_before_width_${uuid}`;
  const afterWidthLocal = get(localStorageKeyAfter);
  const beforeWidthLocal = get(localStorageKeyBefore);

  const mainContainerRef = useRef(null);
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);

  const [afterWidthState, setAfterWidthState] = useState(null);
  const afterWidth = useMemo(() => {
    if (typeof afterWidthProp !== 'undefined' || afterWidthOverride) {
      return afterWidthProp;
    } else {
      return afterWidthState;
    }
  }, [afterWidthProp, afterWidthState, afterWidthOverride]);

  const setAfterWidth = useCallback((prev) => {
    let value = prev;
    if (setAfterWidthProp) {
      setAfterWidthProp(prev);
    } else {
      setAfterWidthState(prev);
    }

    set(localStorageKeyAfter, Math.max(value, 20  * UNIT));

    return value;
  }, [localStorageKeyAfter, setAfterWidthProp, setAfterWidthState]);

  useEffect(() => {
    if (after) {
      setAfterWidth(Math.max(afterWidthLocal, 20  * UNIT));
    }
  }, []);

  const [beforeWidthState, setBeforeWidthState] = useState(null);
  const beforeWidth = useMemo(() => {
    if (typeof beforeWidthProp !== 'undefined') {
      return beforeWidthProp;
    } else {
      return beforeWidthState;
    }
  }, [beforeWidthProp, beforeWidthState]);

  const setBeforeWidth = useCallback((prev) => {
    let value = prev;
    if (setBeforeWidthProp) {
      setBeforeWidthProp(prev);
    } else {
      setBeforeWidthState(prev);
    }

    set(localStorageKeyBefore, Math.max(value, 20  * UNIT));

    return value;
  }, [localStorageKeyBefore, setBeforeWidthProp, setBeforeWidthState]);

  useEffect(() => {
    if (before) {
      setBeforeWidth(Math.max(beforeWidthLocal, 20  * UNIT));
    }
  }, []);

  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);
  const [, setMainContainerWidth] = useState<number>(null);

  const {
    project,
  } = useProject();

  const breadcrumbs = [];
  if (breadcrumbsProp) {
    // if (addProjectBreadcrumbToCustomBreadcrumbs) {
    //   breadcrumbs.push(...breadcrumbProjects);
    // }

    breadcrumbs.push(...breadcrumbsProp);
  }

  if ((!breadcrumbsProp?.length || appendBreadcrumbs) && project) {
    if (!breadcrumbsProp?.length) {
      breadcrumbs.unshift({
        bold: !appendBreadcrumbs,
        label: () => title,
      });
    }
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
        // excludeProject={!addProjectBreadcrumbToCustomBreadcrumbs}
        menuItems={headerMenuItems}
      />

      <ContainerStyle ref={ref}>
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
            afterHeader={afterHeader}
            afterHeightOffset={HEADER_HEIGHT}
            afterHidden={afterHidden}
            afterMousedownActive={afterMousedownActive}
            afterWidth={afterWidth}
            before={before}
            beforeHeader={beforeHeader}
            beforeHeightOffset={HEADER_HEIGHT}
            beforeMousedownActive={beforeMousedownActive}
            // beforeWidth={VERTICAL_NAVIGATION_WIDTH + (before ? beforeWidth : 0)}
            beforeWidth={before ? beforeWidth : VERTICAL_NAVIGATION_WIDTH}
            contained={contained}
            headerOffset={headerOffset}
            hideAfterCompletely={!after || !setAfterHidden || hideAfterCompletely}
            leftOffset={before ? VERTICAL_NAVIGATION_WIDTH : null}
            mainContainerHeader={mainContainerHeader}
            mainContainerRef={mainContainerRef}
            setAfterHidden={setAfterHidden}
            setAfterMousedownActive={setAfterMousedownActive}
            setAfterWidth={setAfterWidth}
            setBeforeMousedownActive={setBeforeMousedownActive}
            setBeforeWidth={setBeforeWidth}
          >
            {subheaderChildren && (
              <Subheader noPadding={subheaderNoPadding}>
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

export default React.forwardRef(Dashboard);
