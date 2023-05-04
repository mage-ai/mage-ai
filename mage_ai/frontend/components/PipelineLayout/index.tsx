import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import ErrorPopup from '@components/ErrorPopup';
import Head from '@oracle/elements/Head';
import Header, { BreadcrumbType } from '@components/shared/Header';
import PipelineType from '@interfaces/PipelineType';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import {
  AFTER_DEFAULT_WIDTH,
  BEFORE_DEFAULT_WIDTH,
} from '@components/TripleLayout/index.style';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH,
  get,
  set,
} from '@storage/localStorage';
import { NavigationItem } from '@components/Dashboard/VerticalNavigation';
import { PAGE_NAME_EDIT } from '@components/PipelineDetail/constants';
import { capitalize } from '@utils/string';
import { useWindowSize } from '@utils/sizes';

type PipelineLayoutProps = {
  after?: any;
  afterHeader?: any;
  afterHeightOffset?: number;
  afterHidden?: boolean;
  afterNavigationItems?: NavigationItem[];
  afterOverflow?: 'hidden';
  afterSubheader?: any;
  before?: any;
  beforeHeader?: any;
  beforeHeightOffset?: number;
  beforeNavigationItems?: NavigationItem[];
  children: any;
  errors: any;
  headerOffset?: number;
  mainContainerHeader?: any;
  mainContainerRef?: any;
  page: string;
  pipeline: PipelineType;
  setAfterHidden?: (value: boolean) => void;
  setAfterWidthForChildren?: (width: number) => void;
  setErrors?: (errors: any) => void;
  setMainContainerWidth?: (width: number) => void;
};

function PipelineLayout({
  after,
  afterHeader,
  afterHeightOffset,
  afterHidden: afterHiddenProp,
  afterNavigationItems,
  afterOverflow,
  afterSubheader,
  before,
  beforeHeader,
  beforeHeightOffset,
  beforeNavigationItems,
  children,
  errors,
  headerOffset,
  mainContainerHeader,
  mainContainerRef,
  page,
  pipeline,
  setAfterHidden: setAfterHiddenProp,
  setAfterWidthForChildren,
  setErrors,
  setMainContainerWidth,
}: PipelineLayoutProps) {
  const {
    width: widthWindow,
  } = useWindowSize();
  const [afterWidth, setAfterWidth] = useState(
    get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH, AFTER_DEFAULT_WIDTH));
  const [beforeWidth, setBeforeWidth] = useState(
    get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH, BEFORE_DEFAULT_WIDTH));
  const [beforeHidden, setBeforeHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);

  let afterHidden = afterHiddenProp;
  let setAfterHidden = setAfterHiddenProp;

  if (!setAfterHidden) {
    [afterHidden, setAfterHidden] =
      useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN));
  }

  useEffect(() => {
    if (mainContainerRef?.current && !afterMousedownActive && !beforeMousedownActive) {
      setMainContainerWidth?.(mainContainerRef.current.getBoundingClientRect().width);
    }
  }, [
    afterMousedownActive,
    beforeMousedownActive,
    afterHidden,
    afterWidth,
    beforeHidden,
    beforeWidth,
    mainContainerRef,
    setMainContainerWidth,
    widthWindow,
  ]);

  useEffect(() => {
    if (!afterMousedownActive) {
      setAfterWidthForChildren?.(afterWidth);
      set(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH, afterWidth);
    }
  }, [
    afterMousedownActive,
    afterWidth,
    setAfterWidthForChildren,
  ]);
  useEffect(() => {
    if (!beforeMousedownActive) {
      set(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH, beforeWidth);
    }
  }, [
    beforeMousedownActive,
    beforeWidth,
  ]);

  const { data: dataProjects } = api.projects.list({}, { revalidateOnFocus: false });
  const projects = dataProjects?.projects;
  const headerMemo = useMemo(() => {
    const breadcrumbs: BreadcrumbType[] = [
      {
        label: () => 'Pipelines',
        linkProps: {
          as: '/pipelines',
          href: '/pipelines',
        },
      },
    ];

    if (pipeline) {
      breadcrumbs.push(...[
        {
          bold: PAGE_NAME_EDIT !== page,
          label: () => pipeline?.uuid,
          linkProps: {
            as: `/pipelines/${pipeline?.uuid}`,
            href: '/pipelines/[pipeline]',
          },
        },
      ]);

      if (PAGE_NAME_EDIT === page) {
        breadcrumbs.push(...[
          {
            bold: true,
            label: () => capitalize(page),
          },
        ]);
      }
    }

    return (
      <Header
        breadcrumbs={breadcrumbs}
        project={projects?.[0]}
        version={projects?.[0]?.version}
      />
    );
  }, [
    page,
    pipeline,
    projects,
  ]);

  return (
    <>
      <Head title={pipeline?.name} />

      <TripleLayout
        after={after}
        afterHeader={afterHeader}
        afterHeightOffset={afterHeightOffset}
        afterHidden={afterHidden}
        afterMousedownActive={afterMousedownActive}
        afterNavigationItems={afterNavigationItems}
        afterOverflow={afterOverflow}
        afterSubheader={afterSubheader}
        afterWidth={afterWidth}
        before={before}
        beforeHeader={beforeHeader}
        beforeHeightOffset={beforeHeightOffset}
        beforeHidden={beforeHidden}
        beforeMousedownActive={beforeMousedownActive}
        beforeNavigationItems={beforeNavigationItems}
        beforeWidth={beforeWidth}
        header={headerMemo}
        headerOffset={headerOffset}
        mainContainerHeader={mainContainerHeader}
        mainContainerRef={mainContainerRef}
        navigationShowMore
        setAfterHidden={setAfterHidden}
        setAfterMousedownActive={setAfterMousedownActive}
        setAfterWidth={setAfterWidth}
        setBeforeHidden={setBeforeHidden}
        setBeforeMousedownActive={setBeforeMousedownActive}
        setBeforeWidth={setBeforeWidth}
      >
        {children}
      </TripleLayout>

      {errors && (
        <ClickOutside
          disableClickOutside
          isOpen
          onClickOutside={() => setErrors(null)}
        >
          <ErrorPopup
            {...errors}
            onClose={() => setErrors(null)}
          />
        </ClickOutside>
      )}
    </>
  );
}

export default PipelineLayout;
