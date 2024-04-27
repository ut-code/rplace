// function zoom takes a Uint8ClampedArray, and converts each pixel into a block of `ratio`*`ratio` and returns it.
// height, width are old ones.
// assumes width, height, ratio are all integer.

import React from "react";
import { IntoImage } from "./IntoImage";
import { upscale } from "./upscale";

type Overlay = {
  coord: number[];
  color: number[];
};
export function UpscaledImage({
  data,
  w,
  h,
  ratio,
  onClick,
  overlay,
}: {
  data: Uint8ClampedArray;
  w: number;
  h: number;
  ratio: number;
  onClick: React.MouseEventHandler;
  overlay: Overlay;
}): React.JSX.Element {
  const arr = upscale(data, w, h, ratio);
  return (
    <div>
      <IntoImage
        arr={arr}
        w={w * ratio}
        h={h * ratio}
        onClick={onClick}
        overlay={overlay}
      />
    </div>
  );
}
