import styles from '@styles/scss/elements/Headline/Headline.module.scss';

type HeadlineProps = {
  children: React.ReactNode | string | number;
  className?: string;
  h: 1 | 2 | 3 | 4 | 5;
};

const Headline = ({ children, h = 1, ...props }: HeadlineProps) => {
  const El = `h${h}`;

  return (
    <El
      className={[styles[`h${h}`], props.className].filter(Boolean).join(' ')}
      {...(props as any)}
    >
      {children}
    </El>
  );
};

export default Headline;
