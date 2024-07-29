import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from 'react-dom/client';
import dynamic from 'next/dynamic';
import stylesFileBrowser from '@styles/scss/components/FileBrowser/FileBrowser.module.scss';
import { CUBIC } from "@mana/animations/ease";
import { MenuToggle } from "./MenuToggle";
import { Navigation } from "./Navigation";
import { motion, sync, useCycle } from "framer-motion";
import { useDimensions } from "./use-dimensions";
import { FileBrowserApp } from "../Apps/catalog";
import ContextProvider from "@context/v2/ContextProvider";

const SystemBrowser = dynamic(() => import('../Apps/Browser/System'), { ssr: false });
const AppsManager = dynamic(() => import('@components/v2/Apps/Manager'), {
  ssr: false,
});

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

export default function FileBrowser() {
  const backgroundRef = useRef(null);
  const borderRef = useRef(null);
  const containerRef = useRef(null);
  const fileBrowserRootRef = useRef(null);
  const fileBrowserRef = useRef(null);
  const openRef = useRef(false);
  const phaseRef = useRef(0);
  const observerRef = useRef(null);

  const [dimensions, setDimensions] = useState(null);
  const [isOpen, toggleOpenCycle] = useCycle(false, true);
  const [sidebar, setSidebar] = useState(null);

  const toggleOpen = useCallback(() => {
    openRef.current = !openRef.current;
    toggleOpenCycle();

    if (!fileBrowserRootRef.current) {
      fileBrowserRootRef.current = createRoot(fileBrowserRef.current);
      fileBrowserRootRef.current.render(
        <ContextProvider>
          {fileBrowserMemo}
        </ContextProvider>
      );
    }
  }, []);

  useEffect(() => {
    if (phaseRef.current === 0 && containerRef.current) {
      const height = containerRef.current.offsetHeight;
      const width = containerRef.current.offsetWidth;

      const sidebarVariants = {
        open: () => ({
          // clipPath: `circle(${opts?.height * 2 + 200}px at -40px -40px)`,
          clipPath: `inset(0px ${width * -2}px ${height * -3}px 0px)`,
          transition: {
            duration: ANIMATION_DURATION,
            restDelta: 2,
            stiffness: 20,
            type: "spring",
          }
        }),
        closed: () => ({
          // clipPath: "circle(100px at 0px 0px)",
          clipPath: `inset(0px ${width - 64}px ${height - 44}px 0px)`,
          transition: {
            damping: 40,
            duration: ANIMATION_DURATION,
            stiffness: 400,
            type: "spring",
          }
        }),
      };

      setDimensions({ height, width });
      setSidebar(
        <motion.div
          className={stylesFileBrowser.background}
          onAnimationComplete={() => {
            if (!openRef.current) {
              backgroundRef.current.classList.add(stylesFileBrowser.backgroundInactive);
            }
          }}
          onAnimationStart={() => {
            if (openRef.current) {
              backgroundRef.current.classList.remove(stylesFileBrowser.backgroundInactive);
            }
          }}
          ref={backgroundRef}
          variants={sidebarVariants}
        >
          <motion.div
            className={stylesFileBrowser.fileBrowser}
            ref={fileBrowserRef}
            variants={fileBrowserVariants}
          />
        </motion.div>
      );

      observerRef.current = new ResizeObserver(observedElements => {
        if (containerRef.current && borderRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          borderRef.current.setAttribute(
            'd',
            buildPath(rect.width, rect.height, 12),
          );
        }
      });
      observerRef.current.observe(document.body);

      phaseRef.current = 1;
    }

    return () => {
      phaseRef.current = 0;
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fileBrowserMemo = useMemo(() => <SystemBrowser app={FileBrowserApp()} />, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const appsManagerMemo = useMemo(() => <AppsManager />, []);

  return (
    <>
      <motion.nav
        animate={isOpen ? 'open' : 'closed'}
        className={stylesFileBrowser.nav}
        // custom={dimensions}
        initial={false}
        ref={containerRef}
      >
        {sidebar}

        {/* <Navigation /> */}

        <MenuToggle toggle={() => toggleOpen()} />

      </motion.nav>

      {dimensions?.height && dimensions?.width && (
        <motion.svg
          className={stylesFileBrowser.svgBorder}
          height={dimensions.height}
          width={dimensions.width}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={isOpen ? "open" : "closed"}
            d={buildPath(dimensions.width, dimensions.height, 12)}
            fill="transparent"
            initial={false}
            // onAnimationComplete={() => {
            //   borderRef.current.classList.add(stylesFileBrowser.borderInactive);
            // }}
            // onAnimationStart={() => {
            //   borderRef.current.classList.remove(stylesFileBrowser.borderInactive);
            // }}
            ref={borderRef}
            stroke="var(--borders-color-base-default)"
            strokeWidth="var(--borders-width)"
            variants={borderVariants}
          />
        </motion.svg>
      )}
    </>
  );
}
