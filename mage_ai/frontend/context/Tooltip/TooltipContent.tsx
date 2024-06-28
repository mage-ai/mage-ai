import React from 'react';
import { TooltipProvider, useTooltip } from './TooltipContext';

const Content: React.FC = () => {
  const { showTooltip, hideTooltip } = useTooltip();

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const position = { x: event.clientX, y: event.clientY };
    showTooltip('Clicked!', position);

    setTimeout(() => {
      hideTooltip(); // Hide tooltip after 2 seconds
    }, 2000); // Adjust the delay as needed

    event.preventDefault();
  };

  return (
    <div onClick={handleClick} style={{ padding: '50px', border: '1px solid black', cursor: 'pointer' }}>
      Click anywhere in this box to display the tooltip.
    </div>
  );
};

const App: React.FC = () => {
  return (
    <TooltipProvider>
      <Content />
    </TooltipProvider>
  );
};

export default App;
