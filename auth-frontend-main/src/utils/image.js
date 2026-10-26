// Client-side image helpers: shrink big phone photos before upload so requests stay small.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function resize(src, maxDim, quality) {
  const img = await loadImage(src);
  let { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function fileToCompressedDataUri(file) {
  return resize(await readFile(file), 1200, 0.8);
}

// ~480px copy used on list pages (cards) so browsing never downloads full-size photos.
export async function makeThumbnail(dataUri) {
  return resize(dataUri, 480, 0.72);
}
