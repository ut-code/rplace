import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "node:crypto";

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

if (WEB_ORIGIN) {
  app.use(cors({ origin: WEB_ORIGIN }));
}

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
    origin: WEB_ORIGIN!,
  },
  cookie: true,
});

const BUTTON_COOLDOWN_SECONDS = 10;
BUTTON_COOLDOWN_SECONDS;
const IMAGE_WIDTH = 16;
const IMAGE_HEIGHT = 16;
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
      `some value is not integer. r: ${color.r}, g: ${color.g}, b: ${color.b}, a: ${color.a}`,
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
type Ev = {
  x: number;
  y: number;
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
};
function onPlacePixel(ev: Ev) {
  log("socket event 'place-pixel' received.");
  log(ev);
  placePixel(ev.x, ev.y, ev.color);
  // of() is for namespaces, and to() is for rooms
  io.of("/").to("pixel-sync").emit("re-render", data);
}


/* request validation.
0. prepare: a map (I'm calling it `idTimerMap` from now on)
1. store keys that should be one-to-one to clients. (I'm calling this `client id` from now on)
  (one-to-one means that clients should not share the same key, and a client's device should not have more than two keys (if this functionality is possible))
2. on connection, create an entry (k-v pair) in idTimerMap with client id as key and current time as value.
  - don't forget to defer deleting on disconnection
3. on place-pixel request, consider the request valid if:
  a. there is an entry that matches the id of the client, and
  b. current time - (the entry's value) >= $BUTTON_COOLDOWN_SECONDS * 1000 - (some possible clock delay like 100ms idk)

yes, it's possible to attack this via cli socket.io client + concurrent processes. 
so I might add a recaptcha later.
*/

type Id = string;
const idTimerMap = new Map<Id, Date>();
// i'm reading the value later, stupid tsc
idTimerMap;

// socket events need to be registered inside here.
// on connection is one of the few exceptions. (i don't know other exceptions though)
io.on("connection", (socket) => {
  socket.join("pixel-sync");

  // create crypto-safe random value (correct me if I'm wrong)
  crypto.randomBytes(32, (err, buf) => { // 32 bytes = 256 bits = 2 ^ 256 possibilities
    if (err) throw new Error("node:crypto.randomBytes has failed. I have no idea what happened. Here's the error anyways: " + err.toString());
    buf; // TODO!
  });
});

app.put("/place-pixel", (req, res) => {
  let intermediate_buffer_dont_mind_me: Ev | null = null;
  try {
    intermediate_buffer_dont_mind_me = req.body as Ev; // this fails for some reason?
  } catch (e) {
    res.status(400).send("Invalid request.");
    return;
  }
  const ev = intermediate_buffer_dont_mind_me;
  onPlacePixel(ev);
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
