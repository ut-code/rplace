// function zoom takes a Uint8ClampedArray, and converts each pixel into a block of `ratio`*`ratio` and returns it.
// height, width are old ones.
// assumes width, height, ratio are all integer.

import React from "react";
import { IntoImage } from "./IntoImage";
import { upscale } from "./upscale";
import { applyOverlay } from "./apply-overlay.ts";

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
  const withOverlayApplied = Uint8ClampedArray.from(arr);
  applyOverlay(withOverlayApplied, {
    center: overlay.coord.map((n) => n * ratio).map((s) => s + ratio / 2),
    color: overlay.color,
    width: w * ratio,
    radius: Math.floor(ratio) / 2,
  });
  return (
    <div>
      <IntoImage
        arr={withOverlayApplied}
        w={w * ratio}
        h={h * ratio}
        onClick={onClick}
      />
    </div>
  );
}
