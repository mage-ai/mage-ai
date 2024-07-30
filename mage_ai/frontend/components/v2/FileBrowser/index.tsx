import ContextProvider from "@context/v2/ContextProvider";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from 'next/dynamic';
import stylesFileBrowser from '@styles/scss/components/FileBrowser/FileBrowser.module.scss';
import { CUBIC } from "@mana/animations/ease";
import { ElementRoleEnum } from '@mana/shared/types';
import { FileBrowserApp } from "../Apps/catalog";
import { MenuToggle } from "./MenuToggle";
import { OperationTypeEnum } from '../Apps/interfaces';
import { createRoot } from 'react-dom/client';
import { motion, sync, useCycle, useAnimation, useMotionValue, useMotionValueEvent, useTransform } from "framer-motion";
import { RemoveContextMenuType, RenderContextMenuType } from '@mana/hooks/useContextMenu';
import { DragSettingsType } from '../Apps/Browser/System/interfaces';

const NAV_MIN_WIDTH = 300;
const SVG_BORDER_RADIUS = 12;

const SystemBrowser = dynamic(() => import('../Apps/Browser/System'), { ssr: false });

const ANIMATION_DURATION = 0.5;

const buildPath = (width, height, radius) => `
  M${radius},0
  H${width - radius}
  Q${width},0 ${width},${radius}
  V${height - radius}
  Q${width},${height} ${width - radius},${height}
  H${radius}
  Q0,${height} 0,${height - radius}
  V${radius}
  Q0,0 ${radius},0
  Z
`;

const backgroundBorderVariants = {
  open: {
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION * 0.5,
      ease: CUBIC,
    },
  },
  closed: {
    opacity: 1,
    transition: {
      delay: ANIMATION_DURATION * 0.5,
      duration: ANIMATION_DURATION * 0.5,
      ease: CUBIC,
    },
  },
};

const buttonVariants = {
  open: {
    opacity: 0,
    transition: {
      duration: 0,
    },
  },
  closed: {
    opacity: 1,
    transition: {
      duration: 0,
    },
  },
};

const borderVariants = {
  open: {
    pathLength: 1,
    transition: {
      delay: ANIMATION_DURATION * 0.25,
      duration: ANIMATION_DURATION * 0.5,
      ease: CUBIC,
    },
  },
  closed: {
    pathLength: 0,
    transition: {
      duration: ANIMATION_DURATION * 0.5,
      ease: CUBIC,
    },
  },
};

const fileBrowserVariants = {
  open: {
    opacity: 1,
    transition: {
      delay: ANIMATION_DURATION / 2,
      duration: ANIMATION_DURATION / 8,
      ease: CUBIC,
    },
  },
  closed: {
    opacity: 0,
    transition: {
      delay: ANIMATION_DURATION / 2,
      duration: ANIMATION_DURATION / 2,
      ease: CUBIC,
    },
  },
};

export default function FileBrowser({
  addPanel,
  itemDragSettings,
  removeContextMenu,
  renderContextMenu,
}: {
    addPanel?: any;
  itemDragSettings?: DragSettingsType;
  removeContextMenu: RemoveContextMenuType;
  renderContextMenu: RenderContextMenuType;
}) {
  const backgroundRef = useRef(null);
  const borderRef = useRef(null);
  const containerRef = useRef(null);
  const fileBrowserRootRef = useRef(null);
  const fileBrowserRef = useRef(null);
  const openRef = useRef(false);
  const phaseRef = useRef(0);
  const observerRef = useRef(null);
  const draggingRef = useRef(false);
  const widthStartRef = useRef(NAV_MIN_WIDTH);

  const svgRef = useRef<any>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  const controls = useAnimation();
  const controlsSidebar = useAnimation();
  const handleX = useMotionValue(0);
  const handleTranslateX = useTransform(handleX, value => -value);
  const widthTransform = useTransform(handleX, latest => {
    const val = widthStartRef.current + latest;
    updatePathDimensions(val);
    return val;
  });

  const [isOpen, toggleOpenCycle] = useCycle(false, true);

  const fileBrowserMemo = useMemo(() =>
    <SystemBrowser
      app={FileBrowserApp({
        operations: {
          [OperationTypeEnum.ADD_PANEL]: {
            effect: addPanel,
          },
        },
      })}
      itemDragSettings={itemDragSettings}
      removeContextMenu={removeContextMenu}
      renderContextMenu={renderContextMenu}
  />, [addPanel, itemDragSettings, removeContextMenu, renderContextMenu]);

  const toggleOpen = useCallback(() => {
    openRef.current = !openRef.current;
    if (openRef.current) {
      containerRef.current.classList.add(stylesFileBrowser.navOpen);
    }

    toggleOpenCycle();

    if (!fileBrowserRootRef.current) {
      fileBrowserRootRef.current = createRoot(fileBrowserRef.current);
      fileBrowserRootRef.current.render(
        <ContextProvider>
          {fileBrowserMemo}
        </ContextProvider>
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updatePathDimensions(width?: number) {
    if (borderRef.current && width) {
      const rect = containerRef?.current?.getBoundingClientRect();

      svgRef.current.setAttribute('height', rect?.height);
      svgRef.current.setAttribute('width', width);

      borderRef.current.setAttribute('d', buildPath(width, rect.height, SVG_BORDER_RADIUS));
    }
  }

  useEffect(() => {
    if (phaseRef.current === 0 && containerRef.current) {
      observerRef.current = new ResizeObserver(observedElements => {
        if (containerRef?.current) {
          updatePathDimensions(containerRef.current.getBoundingClientRect().width);
        }
      });
      observerRef.current.observe(document.body);

      phaseRef.current = 1;
    }

    const handleClickOutside = (event: any) => {
      if (containerRef.current && !containerRef.current.contains(event.target) && openRef.current) {
        toggleOpen();
        resizeHandleRef.current && resizeHandleRef.current.classList.add(stylesFileBrowser.hide);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      phaseRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isOpen) {
      resizeHandleRef.current && resizeHandleRef.current.classList.remove(stylesFileBrowser.hide);
    }
    if (containerRef.current) {
      const { height, width } = containerRef.current.getBoundingClientRect();
      updatePathDimensions(width);

      controls.start(isOpen ? borderVariants.open : borderVariants.closed);

      controlsSidebar.start(isOpen ? {
        clipPath: `inset(0px ${width * -2}px ${height * -3}px 0px)`,
        transition: {
          duration: ANIMATION_DURATION,
          restDelta: 2,
          stiffness: 20,
          type: "spring",
        }
      } : {
        clipPath: `inset(0px ${width - 64}px ${height - 44}px 0px)`,
        transition: {
          damping: 40,
          duration: ANIMATION_DURATION,
          stiffness: 400,
          type: "spring",
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startDrag = useCallback((event: any) => {
    event.preventDefault();
    draggingRef.current = true;
    handleX.set(0);
    widthStartRef.current = widthTransform.get();
    updatePathDimensions(widthStartRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const endDrag = useCallback(() => {
    draggingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <motion.div
        animate={isOpen ? 'open' : 'closed'}
        className={stylesFileBrowser.backgroundBorder}
        variants={backgroundBorderVariants}
      />

      <motion.button
        animate={isOpen ? 'open' : 'closed'}
        className={[
          stylesFileBrowser.button,
          stylesFileBrowser.buttonFloater,
          isOpen ? stylesFileBrowser.buttonNavOpen : stylesFileBrowser.buttonNavClosed,
        ].filter(Boolean).join(' ')}
        onClick={toggleOpen}
        variants={buttonVariants}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      />

      <motion.nav
        animate={isOpen ? 'open' : 'closed'}
        className={[
          stylesFileBrowser.nav,
        ].filter(Boolean).join(' ')}
        initial={false}
        ref={containerRef}
        style={{
          width: widthTransform,
        }}
      >
        <motion.div
          animate={controlsSidebar}
          className={[stylesFileBrowser.background, stylesFileBrowser.backgroundInactive].join(' ')}
          onAnimationComplete={() => {
            // svgRef.current.classList.add(stylesFileBrowser.hide);

            if (openRef.current) {
              backgroundRef.current.classList.add(stylesFileBrowser.backgroundActive);
            } else {
              backgroundRef.current.classList.add(stylesFileBrowser.backgroundInactive);
              backgroundRef.current.classList.remove(stylesFileBrowser.backgroundActive);
              containerRef.current.classList.remove(stylesFileBrowser.navOpen);
            }
          }}
          onAnimationStart={() => {
            // svgRef.current.classList.remove(stylesFileBrowser.hide);

            if (openRef.current) {
              backgroundRef.current.classList.remove(stylesFileBrowser.backgroundInactive);
            }
          }}
          ref={backgroundRef}
        >
          <motion.div
            className={stylesFileBrowser.fileBrowser}
            ref={fileBrowserRef}
            variants={fileBrowserVariants}
          />
        </motion.div>

        <MenuToggle toggle={() => toggleOpen()} />
        {/* <Navigation /> */}

        <motion.div
          className={[
            stylesFileBrowser.resizeHandle,
            stylesFileBrowser.right,
          ].filter(Boolean).join(' ')}
          drag="x"
          dragMomentum={false}
          dragPropagation={false}
          initial={{ opacity: 0 }}
          ref={resizeHandleRef}
          onDragEnd={endDrag}
          onPointerUp={endDrag}
          onPointerDown={(event: any) => {
            startDrag(event);
          }}
          role={[
            ElementRoleEnum.RESIZEABLE,
          ].filter(Boolean).join(' ')}
          style={{
            originX: 0.5,
            originY: 0.5,
            translateX: handleTranslateX,
            x: handleX,
          }}
          whileDrag={{
            opacity: 0.0,
            scaleX: 0.1,
            transition: {
              duration: 0,
            }
          }}
          whileHover={{ opacity: 0.3, scaleX: 1 }}
          whileTap={{ opacity: 0.2, scaleX: 0.5 }}
        />
      </motion.nav>

      <motion.svg
        className={stylesFileBrowser.svgBorder}
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          animate={controls}
          fill="transparent"
          initial={false}
          ref={borderRef}
          stroke="var(--borders-color-base-default)"
          strokeWidth="var(--borders-width)"
        />
      </motion.svg>
    </>
  );
}
