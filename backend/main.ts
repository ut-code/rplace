import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

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

const IMAGE_WIDTH = 16;
const IMAGE_HEIGHT = 16;
// const DATA_LEN = IMAGE_HEIGHT * IMAGE_WIDTH * 4;

const data = createRandomArray(IMAGE_WIDTH, IMAGE_HEIGHT);
const client = new PrismaClient();

app.get("/image", (_, res) => {
  res.send(JSON.stringify(data));
});

type PlacePixelRequest = {
  x: number;
  y: number;
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
};

function placePixel(ev: PlacePixelRequest) {
  const { x, y, color } = ev;
  if (
    x >= IMAGE_WIDTH ||
    y >= IMAGE_HEIGHT ||
    x < 0 ||
    y < 0 ||
    !Number.isInteger(x) ||
    !Number.isInteger(y)
  ) {
    log(`Invalid x or y found in placePixel(). x: ${x}, y: ${y}`);
    return;
  }
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
    log(`Invalid RGBA value found. rgba: {
      r: ${color.r}
      g: ${color.g}
      b: ${color.b}
      a: ${color.a}
    }`);
    return;
  }
  if (
    [color.r, color.g, color.b, color.a]
      .map((n) => Number.isInteger(n))
      .some((b: boolean) => !b)
  ) {
    log(
      `some value is not integer. r: ${color.r}, g: ${color.g}, b: ${color.b}, a: ${color.a}`
    );
    return;
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

async function onDecidingPixelColor(ev: PlacePixelRequest) {
  const { x, y, color } = ev;
  log("socket event 'place-pixel' received.");
  log(ev);
  placePixel(ev);
  // of() is for namespaces, and to() is for rooms
  io.of("/").to("pixel-sync").emit("re-render", data);
  await client.pixelColor.update({
    where: { colIndex: x, rowIndex: y },
    data: { data: JSON.stringify(data.slice(x + 16 * y, x + 16 * y + 2)) },
  });
}

// socket events need to be registered inside here.
// on connection is one of the few exceptions. (i don't know other exceptions though)
io.on("connection", (socket) => {
  socket.join("pixel-sync");
  const rowIndex: number = 0;
  const colIndex: number = 0;
  const data: number[] = [];
  while (rowIndex < 16) {
    while (colIndex < 16) {
      client.query(
        `SELECT data FROM pixelColor WHERE rowIndex = ${rowIndex} AND colIndex = ${colIndex}`,
        (error: any[], results: number[]) => {
          if (error) {
            socket.emit("error", {
              message: "Couldn't get information from database.",
            });
          } else {
            data[rowIndex * 16 + colIndex] = results[0];
            data[rowIndex * 16 + colIndex + 1] = results[1];
            data[rowIndex * 16 + colIndex + 2] = results[2];
            data[rowIndex * 16 + colIndex + 3] = 255;
          }
        }
      );
    }
  }
  socket.emit("data", data);
});

app.put("/place-pixel", (req, res) => {
  let intermediate_buffer_dont_mind_me: PlacePixelRequest | null = null;
  try {
    intermediate_buffer_dont_mind_me = req.body as PlacePixelRequest; // this fails for some reason?
  } catch (e) {
    log(e, req.body);
    res.status(400).send("Invalid request.");
    return;
  }
  const ev = intermediate_buffer_dont_mind_me;
  onDecidingPixelColor(ev);
  res.status(202).send("ok"); // since websocket will do the actual work, we just send status 202: Accepted
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
