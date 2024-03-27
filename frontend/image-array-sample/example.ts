export function setImageData(arr: Uint8ClampedArray, width: number, height: number): string {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return '';

    const u8arr = Uint8ClampedArray.from(arr);

    const imageData = ctx.createImageData(width, height);
    imageData.data.set(u8arr);

    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL();
}

export function createRandomArray(width: number, height: number): Uint8ClampedArray {
    const arr = new Uint8ClampedArray(width * height * 4);
    for (let h = 0; h < height; h++) {
        for (let w = 0; w < width; w++) {
            const idx = (h * width + w) * 4;
            arr[idx] = 16 * w % 256; // Red
            arr[idx + 1] = 16 * h % 256; // Green
            arr[idx + 2] = 16 * idx % 256; // Blue
            arr[idx + 3] = 255; // Alpha (transparency)
        }
    }
    return arr;
}