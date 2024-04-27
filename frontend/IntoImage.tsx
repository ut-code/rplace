import React from "react";

import { createImageURI } from "./image-array";

export function IntoImage({
  arr,
  w,
  h,
  onClick,
  overlay,
}: {
  arr: Uint8ClampedArray;
  w: number;
  h: number;
  onClick: React.MouseEventHandler;
  overlay: { coord: number[]; color: number[] };
}): React.JSX.Element | null {
  const uri = createImageURI(arr, w, h);
  return <img src={uri} width={w} height={h} onClick={onClick}></img>;
}
