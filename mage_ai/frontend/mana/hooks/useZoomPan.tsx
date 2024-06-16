import { useRef, useEffect } from 'react';

export const useZoomPan = (
    elementRef: React.RefObject<HTMLElement>,
    zoomSensitivity = 0.5,
    minScale = 0.01,
    maxScale = 4,
) => {
    const scale = useRef(1);
    const originX = useRef(0);
    const originY = useRef(0);
    const startX = useRef(0);
    const startY = useRef(0);
    const isPanning = useRef(false);
    const styleSheet = useRef<HTMLStyleElement | null>(null);

    useEffect(() => {
        const element = elementRef.current;
        const head = document.head;

        if (!element) return;

        const updateTransform = () => {
            element.style.transform = `translate(${originX.current}px, ${originY.current}px) scale(${scale.current})`;
            const gridSize = 100 * scale.current; // Correct grid sizing based on scale

            if (!styleSheet.current) {
                styleSheet.current = document.createElement('style');
                head.appendChild(styleSheet.current);
            }

            if (!styleSheet.current.parentElement) {
                head.appendChild(styleSheet.current);
            }

            styleSheet.current.innerHTML = `
                .canvas::before, .canvas::after {
                    background-size: ${gridSize}px ${gridSize}px !important;
                }
            `;
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = -e.deltaY / 500 * zoomSensitivity;
            scale.current = Math.min(Math.max(minScale, scale.current + delta), maxScale);

            updateTransform();
        };

        const handleMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            startX.current = e.clientX - originX.current;
            startY.current = e.clientY - originY.current;
            isPanning.current = true;
        };

        const handleMouseUp = () => {
            isPanning.current = false;
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isPanning.current) return;

            originX.current = e.clientX - startX.current;
            originY.current = e.clientY - startY.current;

            updateTransform();
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                startX.current = touch.clientX - originX.current;
                startY.current = touch.clientY - originY.current;
                isPanning.current = true;
            }
        };

        const handleTouchEnd = () => {
            isPanning.current = false;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPanning.current || e.touches.length !== 1) return;

            const touch = e.touches[0];
            originX.current = touch.clientX - startX.current;
            originY.current = touch.clientY - startY.current;

            updateTransform();
        };

        element.addEventListener('wheel', handleWheel);
        element.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('touchstart', handleTouchStart);
        element.addEventListener('touchend', handleTouchEnd);
        element.addEventListener('touchmove', handleTouchMove);

        return () => {
            element.removeEventListener('wheel', handleWheel);
            element.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchmove', handleTouchMove);
            if (styleSheet.current && styleSheet.current.parentNode === head) {
                head.removeChild(styleSheet.current);
            }
        };
    }, [elementRef, zoomSensitivity, minScale, maxScale]);
};
