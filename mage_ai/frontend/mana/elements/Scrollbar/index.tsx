import { forwardRef } from 'react';
import styles from '@styles/scss/components/Scrollbar/Scrollbar.module.scss';

type ScrollbarProps = {
  children: React.ReactNode;
  hidden?: boolean;
};

function Scrollbar({ children, hidden, ...props }: ScrollbarProps, ref: React.Ref<HTMLDivElement>) {
  return (
    <div {...props} className={styles.scrollbar} hidden={hidden} ref={ref}>
      {children}
    </div>
  );
}

export default forwardRef(Scrollbar);
