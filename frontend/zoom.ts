// function zoom takes a Uint8ClampedArray, and converts each pixel into a block of `ratio`*`ratio` and returns it.
// height, width are old ones.
// assumes width, height, ratio are all integer.

import { IntoImage } from "./IntoImage";

export function zoom(
  arr: Uint8ClampedArray,
  width: number,
  height: number,
  ratio: number
): Uint8ClampedArray {
  console.assert(arr.length === width * height * 4);
  const len = width * height;
  const square = ratio ** 2;
  const long = len * square;
  const ret = new Uint8ClampedArray(long * 4);
  const wl = width * ratio;
  for (let i = 0; i < long; ++i) {
    const w = i % wl;
    const h = (i - w) / wl;
    const originalW = Math.floor(w / ratio);
    const originalH = Math.floor(h / ratio);
    const idx = (originalH * width + originalW) * 4; // idx is muitiplied by 4, but i isn't.
    ret[i * 4] = arr[idx];
    ret[i * 4 + 1] = arr[idx + 1];
    ret[i * 4 + 2] = arr[idx + 2];
    ret[i * 4 + 3] = arr[idx + 3];
  }
  console.assert(ret.length === height * width * ratio ** 2 * 4);
  return ret;
}
