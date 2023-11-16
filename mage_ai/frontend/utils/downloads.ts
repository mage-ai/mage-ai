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
