import * as React from "react";
import Icon, { PathStyle } from "@mana/elements/Icon";
import { CUBIC } from "@mana/animations/ease";
import Button from "@mana/elements/Button";
import { CaretDown } from "@mana/icons";
import { motion } from "framer-motion";
import stylesFileBrowser from '@styles/scss/components/FileBrowser/FileBrowser.module.scss';
import { opacity } from "html2canvas/dist/types/css/property-descriptors/opacity";

const arrowVariants1 = {
  open: {
    rotate: 90,
    transition: {
      duration: 0.1,
      ease: CUBIC
    }
  },
  closed: {
    rotate: 0,
    transition: {
      duration: 0.1,
      ease: CUBIC
    }
  }
};

const arrowVariants2 = {
  closed: {
    fill: 'var(--fonts-color-text-secondary)',
  },
  open: {
    fill: 'var(--fonts-color-button-base)',
  },
};

const d1 = 'M7.20002 10C6.7582 10 6.40002 10.3582 6.40002 10.8C6.40002 11.2418 6.7582 11.6 7.20002 11.6H17C17.4419 11.6 17.8 11.2418 17.8 10.8C17.8 10.3582 17.4419 10 17 10H7.20002Z';
const d2 = 'M7.20002 13.6C6.7582 13.6 6.40002 13.9582 6.40002 14.4C6.40002 14.8418 6.7582 15.2 7.20002 15.2H17C17.4419 15.2 17.8 14.8418 17.8 14.4C17.8 13.9582 17.4419 13.6 17 13.6H7.20002Z';
const d3 = 'M7.20002 17.4C6.7582 17.4 6.40002 17.7582 6.40002 18.2C6.40002 18.6418 6.7582 19 7.20002 19H12.8C13.2419 19 13.6 18.6418 13.6 18.2C13.6 17.7582 13.2419 17.4 12.8 17.4H7.20002Z';
const d4 = 'M0.400024 5.6C0.400024 2.50721 2.90723 0 6.00002 0H15.0059C15.8546 0 16.6685 0.337142 17.2687 0.937258L22.6628 6.33137C23.2629 6.93149 23.6 7.74542 23.6 8.59411V18.4C23.6 21.4928 21.0928 24 18 24H6.00002C2.90723 24 0.400024 21.4928 0.400024 18.4V5.6ZM6.00002 1.6C3.79089 1.6 2.00002 3.39086 2.00002 5.6V18.4C2.00002 20.6091 3.79089 22.4 6.00002 22.4H18C20.2092 22.4 22 20.6091 22 18.4V8.59411C22 8.38861 21.9605 8.18718 21.8856 8H19.2C17.2118 8 15.6 6.38823 15.6 4.4V1.71439C15.4128 1.63953 15.2114 1.6 15.0059 1.6H6.00002ZM17.2 3.13137L20.4687 6.4H19.2C18.0955 6.4 17.2 5.50457 17.2 4.4V3.13137Z';

const dc1 = 'M16.7657 7.43436C17.0781 7.74678 17.0781 8.25331 16.7657 8.56573L13.2314 12.1L16.7657 15.6344C17.0781 15.9468 17.0781 16.4533 16.7657 16.7657C16.4533 17.0782 15.9467 17.0782 15.6343 16.7657L12.1 13.2314L8.56567 16.7657C8.25325 17.0782 7.74672 17.0782 7.4343 16.7657C7.12188 16.4533 7.12188 15.9468 7.4343 15.6344L10.9686 12.1L7.4343 8.56573C7.12188 8.25331 7.12188 7.74678 7.4343 7.43436C7.74672 7.12194 8.25325 7.12194 8.56567 7.43436L12.1 10.9687L15.6343 7.43436C15.9467 7.12194 16.4533 7.12194 16.7657 7.43436Z';
const dc2 = 'M0.799988 4.80005C0.799988 2.59091 2.59085 0.800049 4.79999 0.800049H19.2C21.4091 0.800049 23.2 2.59091 23.2 4.80005V19.2C23.2 21.4092 21.4091 23.2 19.2 23.2H4.79999C2.59085 23.2 0.799988 21.4092 0.799988 19.2V4.80005ZM4.79999 2.40005C3.4745 2.40005 2.39999 3.47457 2.39999 4.80005V19.2C2.39999 20.5255 3.4745 21.6 4.79999 21.6H19.2C20.5255 21.6 21.6 20.5255 21.6 19.2V4.80005C21.6 3.47457 20.5255 2.40005 19.2 2.40005H4.79999Z';

const dclosed1 = 'M20.5121 7.78542C20.8515 8.06827 20.8974 8.57272 20.6145 8.91214L14.4583 16.2997C13.1789 17.8349 10.821 17.8349 9.54167 16.2997L3.38539 8.91214C3.10254 8.57272 3.1484 8.06827 3.48782 7.78542C3.82725 7.50257 4.3317 7.54843 4.61455 7.88785L10.7708 15.2754C11.4105 16.043 12.5895 16.043 13.2291 15.2754L19.3854 7.88785C19.6682 7.54843 20.1727 7.50257 20.5121 7.78542Z';
const dopen1 = 'M20.7998 1.20105C22.5671 1.20105 23.9998 2.63374 23.9998 4.40105V19.601C23.9998 21.3684 22.5671 22.8011 20.7998 22.8011H3.19982C1.43251 22.8011 -0.000183105 21.3684 -0.000183105 19.601V4.40105C-0.000183105 2.63374 1.43251 1.20105 3.19982 1.20105H20.7998ZM1.59982 4.40105C1.59982 3.51739 2.31616 2.80105 3.19982 2.80105H9.19977V21.201H3.19982C2.31616 21.201 1.59982 20.4847 1.59982 19.601V4.40105ZM10.7998 21.201H20.7998C21.6835 21.201 22.3998 20.4847 22.3998 19.601V4.40105C22.3998 3.51739 21.6835 2.80105 20.7998 2.80105H10.7998V21.201Z';

const pathVariants1 = {
  closed: {
    d: d1,
    opacity: 1,
  },
  open: {
    d: d1,
    opacity: 0,
  },
};
const pathVariants2 = {
  closed: {
    d: d2,
    opacity: 1,
  },
  open: {
    d: d2,
    opacity: 0,
  },
};
const pathVariants3 = {
  closed: {
    d: d3,
    opacity: 1,
  },
  open: {
    d: d3,
    opacity: 0,
  },
};
const pathVariants4 = {
  closed: {
    clipRule: 'evenodd',
    d: d4,
    fillRule: 'evenodd',
  },
  open: {
    clipRule: 'evenodd',
    d: dopen1,
    fillRule: 'evenodd',
  },
};

const iconVariantsA = {
  closed: {
    opacity: 1,
    ...arrowVariants1.closed,
  },
  open: {
    opacity: 0,
    ...arrowVariants1.open,
  },
};

const iconVariantsB = {
  closed: {
    opacity: 0,
  },
  open: {
    opacity: 1,
  },
};

const iconVariants1 = {
  closed: {
    clipRule: 'evenodd',
    d: dclosed1,
    fill: 'var(--fonts-color-text-secondary)',
    fillRule: 'evenodd',
  },
  open: {
    d: dc1,
    fill: 'var(--fonts-color-button-base)',
  },
};

const iconVariants2 = {
  closed: {
    clipRule: 'evenodd',
    d: dc2,
    fill: 'var(--fonts-color-text-secondary)',
    fillRule: 'evenodd',
    opacity: 0,
  },
  open: {
    clipRule: 'evenodd',
    d: dc2,
    fill: 'var(--fonts-color-button-base)',
    fillRule: 'evenodd',
    opacity: 1,
  },
};

const buttonVariants = {
  closed: {
    transition: {
      ease: CUBIC,
    },
    width: 64,
  },
  open: {
    width: 300,
    transition: {
      ease: CUBIC,
    },
  },
};

export const MenuToggle = ({ toggle }) => (
  <motion.button
    className={stylesFileBrowser.button}
    onClick={toggle}
    variants={buttonVariants}
  >
    <Icon fill="none" size={20} viewBox="0 0 24 24">
      <PathStyle variants={pathVariants1} />
      <PathStyle variants={pathVariants2} transition={{ duration: 0.1, ease: CUBIC }} />
      <PathStyle variants={pathVariants3} transition={{ duration: 0.1, ease: CUBIC }} />
      <PathStyle variants={pathVariants4} />
    </Icon>

    <motion.div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 12,
        width: 12,
      }}
      variants={iconVariantsA}
    >
      <Icon
        fill="none"
        size={12}
        viewBox="0 0 24 24"
      >
        <PathStyle useStroke stroke="transparent" variants={iconVariants1} />
        <PathStyle useStroke stroke="transparent" variants={iconVariants2} />
      </Icon>
    </motion.div>

    <motion.div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 20,
        width: 20,
      }}
      // variants={arrowVariants1}
      variants={iconVariantsB}
    >
      <Icon
        fill="none"
        size={20}
        viewBox="0 0 24 24"
      >
        <PathStyle useStroke stroke="transparent" variants={iconVariants1} />
        <PathStyle useStroke stroke="transparent" variants={iconVariants2} />
      </Icon>
    </motion.div>
  </motion.button>
);
