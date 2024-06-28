import BlockNodeWrapper from '../../Canvas/Nodes/BlockNodeWrapper';
import { NodeItemType } from '../../Canvas/interfaces';
import { RectType } from '@components/v2/Canvas/interfaces';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';
import { useContext, useRef, useState } from 'react';

interface NodeManagerProps {
  handleMouseDown: () => void;
  itemsRef: React.RefObject<any>;
  onDropPort: () => void;
  onItemChangeRef: React.MutableRefObject<(item: NodeItemType) => void>;
  onModelChangeRef: React.MutableRefObject<() => void>;
  onMountItem: () => void;
  onMountPort: () => void;
  submitEventOperation: () => void;
}

interface DynamicRoot {
  element: HTMLDivElement;
  root: Root;
  id: string;
  item: NodeItemType;
  updateListener: (event: CustomEvent) => void;
}

export default function useNodeManager({
  dragEnabled,
  dropEnabled,
  handleDragEnd,
  handleDragStart,
  handleMouseDown,
  itemsRef,
  onDropPort,
  onItemChangeRef,
  onModelChangeRef,
  onMountItem,
  itemRects,
  onMountPort,
  submitEventOperation,
}) {
  const themeContext = useContext(ThemeContext);
  const dynamicRootRef = useRef<HTMLDivElement | null>(null);
  const dynamicRoots = useRef<DynamicRoot[]>([]);

  // Function to add a new component
  const addNewComponent = (item: NodeItemType) => {
    if (dynamicRootRef.current) {
      const newElement = document.createElement('div');
      dynamicRootRef.current.appendChild(newElement);

      // Create a React root for the new element
      const newElementRoot = createRoot(newElement);
      const rect = item?.rect as RectType;

      const updateListener = (event: CustomEvent) => {
        const updatedItem = { ...item, ...event.detail };
        newElementRoot.render(
          <ThemeProvider theme={themeContext}>
            <BlockNodeWrapper
              handlers={{
                onDragEnd: handleDragEnd,
                onDragStart: handleDragStart,
                onDrop: onDropPort,
                onMouseDown: handleMouseDown,
              }}
              item={updatedItem}
              key={item.id}
              onMountItem={onMountItem}
              onMountPort={onMountPort}
              rect={rect}
              submitEventOperation={submitEventOperation}
            />
          </ThemeProvider>
        );
        item = updatedItem; // Update the item reference
      };

      // Initial render
      newElementRoot.render(
        <ThemeProvider theme={themeContext}>
          <BlockNodeWrapper
            handlers={{
              onDragEnd: handleDragEnd,
              onDragStart: handleDragStart,
              onDrop: onDropPort,
              onMouseDown: handleMouseDown,
            }}
            item={item}
            key={item.id}
            onMountItem={onMountItem}
            onMountPort={onMountPort}
            rect={rect}
            submitEventOperation={submitEventOperation}
          />
        </ThemeProvider>,
      );

      // Add event listener to the element
      newElement.addEventListener('updateComponent', updateListener as EventListener);

      // Add to dynamic roots array
      dynamicRoots.current.push({ id: item.id, element: newElement, root: newElementRoot, item, updateListener });
    }
  };

  // Function to update an existing component's props by dispatching a custom event
  const updateComponentProps = (id: string, newProps: Partial<NodeItemType>) => {
    const dynamicRootToUpdate = dynamicRoots.current.find(root => root.id === id);

    if (dynamicRootToUpdate) {
      const event = new CustomEvent('updateComponent', { detail: newProps });
      dynamicRootToUpdate.element.dispatchEvent(event);
    }
  };

  // Function to remove a component by ID
  const removeComponentById = (id: string) => {
    const dynamicRootIndex = dynamicRoots.current.findIndex(root => root.id === id);
    if (dynamicRootIndex > -1) {
      const rootToRemove = dynamicRoots.current[dynamicRootIndex];
      if (rootToRemove && dynamicRootRef.current) {
        rootToRemove.element.removeEventListener('updateComponent', rootToRemove.updateListener as EventListener);
        rootToRemove.root.unmount();
        dynamicRootRef.current.removeChild(rootToRemove.element);
        dynamicRoots.current.splice(dynamicRootIndex, 1);
      }
    }
  };

  // Function to remove all dynamically added components
  const removeAllComponents = () => {
    while (dynamicRoots.current.length > 0) {
      const lastDynamicRoot = dynamicRoots.current.pop();
      if (lastDynamicRoot && dynamicRootRef.current) {
        lastDynamicRoot.element.removeEventListener('updateComponent', lastDynamicRoot.updateListener as EventListener);
        lastDynamicRoot.root.unmount();
        dynamicRootRef.current.removeChild(lastDynamicRoot.element);
      }
    }
  };

  onItemChangeRef.current = (item: NodeItemType) => {
    addNewComponent(item);
  };

  onModelChangeRef.current = () => {

  };

  return {
    addNewComponent,
    dynamicRootRef,
    removeComponentById,
  };
}
