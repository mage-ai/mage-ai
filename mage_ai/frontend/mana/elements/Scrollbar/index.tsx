import { forwardRef } from 'react';
import styles from '@styles/scss/components/Scrollbar/Scrollbar.module.scss';

type ScrollbarProps = {
  children: React.ReactNode;
  className?: string;
  hidden?: boolean;
  padLeft?: boolean;
  style?: React.CSSProperties;
};

function Scrollbar(
  { children, hidden, padLeft, ...props }: ScrollbarProps,
  ref: React.Ref<HTMLDivElement>,
) {
  return (
    <div
      {...props}
      className={[styles.scrollbar, padLeft ? styles['pad-left'] : '', props.className || '']
        .filter(t => t?.length >= 1)
        .join(' ')}
      hidden={hidden}
      ref={ref}
    >
      {children}
    </div>
  );
}

export default forwardRef(Scrollbar);
