import html2canvas from 'html2canvas';

import buildUrl from '@api/utils/url';

export function initiateDownload(token: string) {
    const uri = buildUrl('downloads', token);

    const a = document.createElement('a');
    a.href = uri;
    document.body.appendChild(a); 

    // Trigger the download
    a.click();

    // Clean up
    window.URL.revokeObjectURL(uri);
    document.body.removeChild(a);
}

function inlineStylesForCapture(element: HTMLElement): Map<HTMLElement, string> {
    const backups = new Map<HTMLElement, string>();

    // Inline computed styles on HTML elements inside foreignObject
    // so html2canvas can resolve styled-components CSS.
    const foreignObjects = element.querySelectorAll('foreignObject');
    foreignObjects.forEach((fo) => {
        fo.querySelectorAll('*').forEach((el) => {
            if (el instanceof HTMLElement) {
                backups.set(el, el.getAttribute('style') || '');
                const computed = window.getComputedStyle(el);
                for (let i = 0; i < computed.length; i++) {
                    const prop = computed[i];
                    if (prop === 'fill') continue;
                    el.style.setProperty(prop, computed.getPropertyValue(prop));
                }
                // Force full opacity and correct text colors so
                // html2canvas renders them at full contrast
                const tag = el.tagName.toLowerCase();
                if (tag === 'p' || tag === 'span') {
                    el.style.setProperty('opacity', '1', 'important');
                    const isBold = computed.fontWeight === '700'
                        || computed.fontWeight === 'bold';
                    const textColor = isBold ? '#FFFFFF' : '#AEAEAE';
                    el.style.setProperty('color', textColor, 'important');
                    el.style.setProperty('-webkit-text-fill-color', textColor, 'important');
                }
            }
        });
    });

    return backups;
}

function restoreStyles(backups: Map<HTMLElement, string>): void {
    backups.forEach((style, el) => {
        if (style) {
            el.setAttribute('style', style);
        } else {
            el.removeAttribute('style');
        }
    });
}

function hideTooltips(element: HTMLElement): HTMLElement[] {
    const hidden: HTMLElement[] = [];
    // Tooltip popups are absolutely positioned divs with z-index 3
    // rendered by styled-components ContentStyle inside Tooltip wrappers
    element.querySelectorAll('div').forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.position === 'absolute' && style.zIndex === '3') {
            el.style.setProperty('display', 'none', 'important');
            hidden.push(el);
        }
    });
    return hidden;
}

function showTooltips(elements: HTMLElement[]): void {
    elements.forEach((el) => el.style.removeProperty('display'));
}

export async function exportDependencyGraph(
    element: HTMLElement,
    filename: string = 'dependency-graph',
): Promise<void> {
    const backups = inlineStylesForCapture(element);
    const hiddenTooltips = hideTooltips(element);

    try {
        const canvas = await html2canvas(element, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#1E1F24',
        });

        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${filename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } finally {
        showTooltips(hiddenTooltips);
        restoreStyles(backups);
    }
}
