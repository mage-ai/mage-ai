import React from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import ErrorPopup from '@components/ErrorPopup';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import Head from '@oracle/elements/Head';
import Header, { BreadcrumbType, MenuItemType } from '@components/shared/Header';
import Subheader from './Subheader';
import TripleLayout from '@components/TripleLayout';
import VerticalNavigation, { VerticalNavigationProps } from './VerticalNavigation';
import useProject from '@utils/models/project/useProject';
import {
  ContainerStyle,
  VERTICAL_NAVIGATION_WIDTH,
  VerticalNavigationStyle,
} from './index.style';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import useTripleLayout, {
  DEFAULT_BEFORE_RESIZE_OFFSET,
} from '@components/TripleLayout/useTripleLayout';

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
  afterWidth,
  afterWidthOverride,
  appendBreadcrumbs,
  before,
  beforeHeader,
  beforeWidth,
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
  setAfterWidth,
  setBeforeWidth,
  setErrors,
  subheaderChildren,
  subheaderNoPadding,
  title,
  uuid,
}: DashboardProps & VerticalNavigationProps, ref) {
  const {
    mainContainerRef,
    mousedownActiveAfter,
    mousedownActiveBefore,
    setMousedownActiveAfter,
    setMousedownActiveBefore,
    setWidthAfter,
    setWidthBefore,
    widthAfter,
    widthBefore,
  } = useTripleLayout(uuid, {
    beforeResizeOffset: DEFAULT_BEFORE_RESIZE_OFFSET,
    setWidthAfter: setAfterWidth,
    setWidthBefore: setBeforeWidth,
    widthAfter: afterWidth,
    widthBefore: beforeWidth,
    widthOverrideAfter: afterWidthOverride,
  });

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
            afterMousedownActive={mousedownActiveAfter}
            afterWidth={widthAfter}
            before={before}
            beforeHeader={beforeHeader}
            beforeHeightOffset={HEADER_HEIGHT}
            beforeMousedownActive={mousedownActiveBefore}
            beforeWidth={before ? widthBefore : VERTICAL_NAVIGATION_WIDTH}
            contained={contained}
            headerOffset={headerOffset}
            hideAfterCompletely={!after || hideAfterCompletely}
            leftOffset={before ? VERTICAL_NAVIGATION_WIDTH : null}
            mainContainerHeader={mainContainerHeader}
            mainContainerRef={mainContainerRef}
            setAfterHidden={setAfterHidden}
            setAfterMousedownActive={setMousedownActiveAfter}
            setAfterWidth={setWidthAfter}
            setBeforeMousedownActive={setMousedownActiveBefore}
            setBeforeWidth={setWidthBefore}
            // beforeWidth={VERTICAL_NAVIGATION_WIDsTH + (before ? beforeWidth : 0)}
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
