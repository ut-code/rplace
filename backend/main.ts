import express from "express";
import { Server } from "socket.io";
import cors from "cors";

import { NODE_ENV, WEB_ORIGIN, VITE_API_ENDPOINT } from "./env.js";

const use = (...args: unknown[]) => {
  args;
};
use(NODE_ENV, VITE_API_ENDPOINT);

const doLogging = NODE_ENV === "development";
if (doLogging) {
  console.log("do logging: true");
}

const log = doLogging
  ? (...x: any[]) => {
      console.log(...x);
    }
  : () => {};

const app = express();

app.use(cors({ origin: WEB_ORIGIN }));

app.use(express.json());

app.use(express.static("./vite-dist"));

/* * * * * * */

const PORT = process.env.PORT || 3200;
const httpServer = app.listen(PORT, () => {
  console.log(`|backend| Listening on ${PORT}...`);
});

/* * * * * * */

// socket io examples
// read https://socket.io/docs/v4/server-api/
const io = new Server(httpServer, {
  cors: {
    origin: process.env.WEB_ORIGIN!,
  },
});

const IMAGE_WIDTH = 512;
const IMAGE_HEIGHT = 512;
// const DATA_LEN = IMAGE_HEIGHT * IMAGE_WIDTH * 4;

const data = createRandomArray(IMAGE_WIDTH, IMAGE_HEIGHT);

app.get("/image", (_, res) => {
  res.send(JSON.stringify(data));
});

function placePixel(
  x: number,
  y: number,
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  },
) {
  // remove these assertions in prod
  if (x >= IMAGE_WIDTH || y >= IMAGE_HEIGHT || x < 0 || y < 0)
    throw new Error(`Invalid x or y found in placePixel().
    x: ${x}, y: ${y}`);
  if (
    color.r < 0 ||
    color.g < 0 ||
    color.b < 0 ||
    color.a < 0 ||
    color.r > 255 ||
    color.g > 255 ||
    color.b > 255 ||
    color.a > 255
  ) {
    throw new Error(`Invalid RGBA value found. rgba: {
      r: ${color.r}
      g: ${color.g}
      b: ${color.b}
      a: ${color.a}
    }`);
  }
  const first_idx = (IMAGE_WIDTH * y + x) * 4;
  data[first_idx] = color.r;
  data[first_idx + 1] = color.g;
  data[first_idx + 2] = color.b;
  // maybe A should be always 255? idk
  data[first_idx + 3] = color.a;
}
/*
namespaces:
- "/" : global namespace

rooms:
- "pixel-sync" : used for pixel transmission

events:
- "connection" : client -> server connection
- "place-pixel" : client -> server, used to place pixel (contains only one pixel data)
- "re-render" : server -> client, re-renders the entire canvas (contains all pixels data)
*/

function onPlacePixel(ev: {
  x: number;
  y: number;
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}) {
  log("socket event 'place-pixel' received.");
  log(ev);
  placePixel(ev.x, ev.y, ev.color);
  // of() is for namespaces, and to() is for rooms
  io.of("/").to("pixel-sync").emit("re-render", data);
}

// socket events need to be registered inside here.
// on connection is one of the few exceptions. (i don't know other exceptions though)
io.on("connection", (socket) => {
  socket.join("pixel-sync");
  socket.on("place-pixel", onPlacePixel);
});

function createRandomArray(width: number, height: number) {
  const arr = new Uint8ClampedArray(width * height * 4);
  for (let h = 0; h < height; h++) {
    for (let w = 0; w < width; w++) {
      const idx = (h * width + w) * 4;
      arr[idx] = (16 * w) % 256; // Red
      arr[idx + 1] = (16 * h) % 256; // Green
      arr[idx + 2] = (16 * idx) % 256; // Blue
      arr[idx + 3] = 255; // Alpha (transparency)
    }
  }
  return Array.from(arr);
}
