// type errno = number;
// function setImageData(image: HTMLImageElement, arr: Array<number>, width: number, height: number): errno {

// 	const canvas = document.createElement("canvas");
// 	canvas.width = width;
// 	canvas.height = height;

// 	const ctx = canvas.getContext("2d");
// 	if (!ctx) return 1;

// 	const u8arr = Uint8ClampedArray.from(arr);

// 	const imageData = ctx.createImageData(width, height);
// 	imageData.data.set(u8arr);

// 	ctx.putImageData(imageData, 0, 0);

// 	const dataUri = canvas.toDataURL();

// 	image.src=dataUri;

// 	return 0;
// }
// setImageData; // I'm using it later, stupid eslint