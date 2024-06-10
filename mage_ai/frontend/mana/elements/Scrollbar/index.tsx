import { forwardRef } from 'react';

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
