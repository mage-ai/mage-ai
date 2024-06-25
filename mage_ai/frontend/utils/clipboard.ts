export function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(
      () => {
        // console.log('Text copied to clipboard');
      },
      err => {
        console.error('Failed to copy text: ', err);
      },
    );
  } else {
    // Fallback for browsers that do not support the Clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // Prevent scrolling to bottom of the page in MS Edge
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      console.log('Fallback: Text copied to clipboard');
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
  }
}
