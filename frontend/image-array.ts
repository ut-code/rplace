type errno = number;
export function setImageData(image: HTMLImageElement, arr: Uint8ClampedArray, width: number, height: number): errno {

	const uri = createImageURI(arr, width, height);

	image.src=uri;

	return 0;
}
export function createImageURI(arr: Uint8ClampedArray, width: number, height: number): string {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("EXPLICIT ERROR: could not get context out of canvas");

	if (!arr) throw new Error("EXPLICIT ERROR: arr is falsy??")
	const u8arr = Uint8ClampedArray.from(arr);

	const imageData = ctx.createImageData(width, height);
	imageData.data.set(u8arr);

	ctx.putImageData(imageData, 0, 0);

	return canvas.toDataURL();
}
