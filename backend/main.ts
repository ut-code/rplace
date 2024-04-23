import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "node:crypto";
import cookie from "cookie";

import { VITE_BUTTON_COOLDOWN, NODE_ENV, WEB_ORIGIN } from "./env.js";

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

const BUTTON_COOLDOWN_SECONDS = VITE_BUTTON_COOLDOWN || 10; // the fallback will be used in prod
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
0. prepare: a map (I'm calling it `idLastWrittenMap` from now on)
1. store keys that should be one-to-one to clients. (I'm calling this `client id` from now on)
  (one-to-one means that clients should not share the same key, and a client's device should not have more than two keys (if this functionality is possible))
2. on connection, create an entry (k-v pair) in idLastWrittenMap with client id as key and current time as value.
  - don't forget to defer deleting on disconnection
3. on place-pixel request, consider the request valid if:
  a. there is an entry that matches the id of the client, and
  b. current time - (the entry's value) >= $BUTTON_COOLDOWN_SECONDS * 1000 - (some possible clock delay like 100ms idk)

yes, it's possible to attack this via cli socket.io client + concurrent processes. 
so I might add a recaptcha later.
*/

type Id = string;
const idLastWrittenMap = new Map<Id, number>();
// this is precision-safe until September 13, 275760 AD. refer https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Date
// clear the cookie log if there is no one connected anymore, to prevent overflowing
setTimeout(
  () => {
    if (io.engine.clientsCount === 0) {
      idLastWrittenMap.clear();
    }
  },
  30 * 60 * 1000,
);

// socket events need to be registered inside here.
// on connection is one of the few exceptions. (i don't know other exceptions though)
io.on("connection", (socket) => {
  socket.join("pixel-sync");
});

// since io.on("connection") cannot give cookies, we need to use io.engine.on("initial_headers"). think this as the same as io.on("connection") with some lower level control
// read https://socket.io/how-to/deal-with-cookies for more
io.engine.on("initial_headers", (headers, request) => {
  let cookies = undefined;
  try {
    cookies = request.headers.cookie && cookie.parse(request.headers.cookie);
  } catch (e) {
    log(e);
    return;
  }
  if (cookies) {
    const id = cookies["device-id"];
    if (id && idLastWrittenMap.has(id)) {
      // this device already has a cookie and the server recognizes the cookie
      return;
    }
  }

  // create crypto-safe random value (correct me if I'm wrong)
  const buf = crypto.randomBytes(32); // 32 bytes = 256 bits = 2 ^ 256 possibilities
  const hex = buf.toString("hex");
  headers["set-cookie"] = cookie.serialize("device-id", hex, {
    maxAge: 3 * 24 * 60 * 60, // 3 days, komaba-fest proof
    httpOnly: true,
  });
  idLastWrittenMap.set(hex, Date.now());

  return;
});

app.put("/place-pixel", (req, res) => {
  if (!req.cookies) {
    res.status(400).send("Bad Request: cookie not found");
  }
  const deviceId = req.cookies["device-id"];
  if (deviceId) {
    res.status(400).send("Bad Request: cookie `device-id` not found");
    return;
  }
  const lastWrittenTime = idLastWrittenMap.get(deviceId);
  if (lastWrittenTime === undefined) {
    // if, by any chance, the server happened to crash and restart while being connected to the client, this might happen.
    res
      .status(400)
      .send("Bad Request: Unknown cookie. where did you get that from?");
    return;
  }
  if (
    Date.now() - lastWrittenTime <
    BUTTON_COOLDOWN_SECONDS * 1000 - 50 /* random small positive number */
  ) {
    // this random small positive number prevents small server-side and connection lags from blocking legitmate requests
    res
      .status(400)
      .send(
        `Bad Request: Last written time recorded in the server is less than ${BUTTON_COOLDOWN_SECONDS} seconds ago.`,
      );
    return;
  }
  idLastWrittenMap.set(deviceId, Date.now());

  let intermediateBufferDontMindMe: Ev | null = null;
  try {
    intermediateBufferDontMindMe = req.body as Ev;
  } catch (e) {
    res.status(400).send("Invalid request.");
    return;
  }
  const ev = intermediateBufferDontMindMe;
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
