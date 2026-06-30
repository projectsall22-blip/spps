/**
 * This function takes the original image and the crop coordinates
 * and returns a small, optimized Base64 string (400x400px).
 */
export const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set the output size (400x400 is perfect for avatars)
  canvas.width = 400;
  canvas.height = 400;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    400,
    400
  );

  // Return as Base64 (using jpeg for smaller size)
  return canvas.toDataURL('image/jpeg', 0.8);
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });