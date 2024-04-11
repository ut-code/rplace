// function zoom takes a Uint8ClampedArray, and converts each pixel into a block of `ratio`*`ratio` and returns it.
// height, width are old ones.
// assumes width, height, ratio are all integer.
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
    console.log(i, w, h);
    ret[i * 4] = arr[idx];
    ret[i * 4 + 1] = arr[idx + 1];
    ret[i * 4 + 2] = arr[idx + 2];
    ret[i * 4 + 3] = arr[idx + 3];
  }
  console.assert(ret.length === height * width * ratio ** 2 * 4);
  return ret;
}

function sample() {
  return 
  const w = 2;
  const h = 2;
  const ratio = 100;
  // const arr = createRandomArray(w, h);
  const arr = Uint8ClampedArray.from([
    255, 255, 0, 255,
    0, 255, 255, 255,
    255, 0, 255, 255,
    0, 255, 0, 255,
  ]);

  const long = zoom(arr, w, h, ratio);

  return (
    <>
      <IntoImage arr={long} w={w * ratio} h={h * ratio}></IntoImage>
      <div className="card">
        {count != null ? (
          <button
            onClick={() => {
              post("/add", { number: 1 }).then((json) => setCount(json.count));
            }}
          >
            count: {count}
          </button>
        ) : (
          <div> loading... </div>
        )}
        {socketCount == null ? (
          <>Loading WebSocket-based count...</>
        ) : (
          <button
            onClick={() => {
              socket.emit("add-socket-count", 1);
            }}
          >
            WebSocket-based count: {socketCount}
          </button>
        )}
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
    </div>
  </>
}
