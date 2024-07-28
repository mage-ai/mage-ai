import { saveAs } from 'file-saver'; // Import the file-saver library
import html2canvas from 'html2canvas';
import { calculateBoundingBox } from '@components/v2/Canvas/utils/layout/shared';

export async function handleSaveAsImage(canvasRef, wrapperRef, rectsMapping, imageDataRef) {
  const generateImage = async boundingBox => {
    const wrapper = wrapperRef.current;

    if (!wrapper) return;

    // Ensure the element is visible
    wrapper.style.opacity = '1';
    wrapper.style.visibility = 'visible';
    wrapper.style.display = 'block';

    // Adding a slight delay to ensure the node is fully rendered
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get bounding box dimensions
    const { width, height } = boundingBox;

    // Calculate the scale required to fit the bounding box within the viewport
    const scaleX = window.innerWidth / width;
    const scaleY = window.innerHeight / height;
    const scale = Math.min(scaleX, scaleY);

    // Save the original transform style to restore later
    const originalTransform = wrapper.style.transform;

    // Apply the calculated scale
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = 'top left';

    // Capture the high DPI image
    const canvas = await html2canvas(wrapper, {
      useCORS: true,
      scale: 2 / scale, // Adjust scale for high DPI
      width: width * scale,
      height: height * scale,
      windowWidth: document.documentElement.scrollWidth * scale,
      windowHeight: document.documentElement.scrollHeight * scale,
    });

    const imageData = canvas.toDataURL('image/png', 1.0); // Ensure maximum quality
    imageDataRef.current = imageData;
    // console.log('Generated Image:', imageData); // For debugging

    // Optional: Save the final image
    saveAs(imageData, 'CapturedImage.png');

    // Restore the original transform style
    wrapper.style.transform = originalTransform;
  };

  const boundingBox = calculateBoundingBox(Object.values(rectsMapping ?? {}));

  boundingBox.left -= boundingBox.width * 0.25;
  boundingBox.width *= 1.5;
  boundingBox.top -= boundingBox.height * 0.25;
  boundingBox.height *= 1.5;

  generateImage(canvasRef.current.getBoundingClientRect());
}
