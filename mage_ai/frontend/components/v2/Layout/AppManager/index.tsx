import React from 'react';
import Grid from '@mana/components/Grid';

function AppManagerLayout({
  className,
  containerRef,
}: {
  className?: string;
  containerRef: React.Ref<HTMLDivElement>;
}, ref: React.Ref<HTMLDivElement>) {
  return (
    <div className={className} ref={ref}>
      <Grid
        height="100%"
        overflow="visible"
        templateColumns="auto-fill"
        templateRows="1fr"
        width="100%"
        style={{
          padding: 'var(--padding-container)',
        }}
      >
        <Grid
          autoFlow="column"
          height="inherit"
          ref={containerRef}
          row={1}
          templateRows="1fr"
          width="inherit"
          style={{
            gridColumnGap: 'var(--padding-container)',
          }}
        />
      </Grid>
    </div>
  );
}

export default React.forwardRef(AppManagerLayout);
