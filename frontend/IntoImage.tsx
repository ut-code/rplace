import React from "react";

import { createImageURI } from "./image-array";

export function IntoImage({
  arr,
  w,
  h,
}: {
  arr: Uint8ClampedArray;
  w: number;
  h: number;
}): React.JSX.Element | null {
  const uri = createImageURI(arr, w, h);
  return <img src={uri} width={w} height={h}></img>;
}
