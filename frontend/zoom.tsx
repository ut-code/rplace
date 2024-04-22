// function zoom takes a Uint8ClampedArray, and converts each pixel into a block of `ratio`*`ratio` and returns it.
// height, width are old ones.
// assumes width, height, ratio are all integer.

import React from "react";
import { IntoImage } from "./IntoImage";
import { upscale } from "./upscale";

export function UpscaledImage({ data, w, h, ratio }): React.JSX.Element {
  return (
    <div>
      <IntoImage arr={upscale(data, w, h, ratio)} w={w * ratio} h={h * ratio} />
    </div>
  );
}
