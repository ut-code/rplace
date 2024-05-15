import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "node:crypto";
import cookie from "cookie";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";

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
app.use(cookieParser());
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

const BUTTON_COOLDOWN_SECONDS = parseInt(VITE_BUTTON_COOLDOWN || "10"); // the fallback will be used in prod
const IMAGE_WIDTH = 16;
const IMAGE_HEIGHT = 16;
// const DATA_LEN = IMAGE_HEIGHT * IMAGE_WIDTH * 4;
const COOKIE_SAME_SITE_RESTRICTION =
  NODE_ENV === "development" ? "strict" : "strict";
log(COOKIE_SAME_SITE_RESTRICTION);

const client = new PrismaClient();
const data = createRandomArray(IMAGE_WIDTH, IMAGE_HEIGHT);
const existingData = await client.pixelColor.findFirst();
if (!existingData) {
  storeData(data);
} else {
  log("Data already exists. Skipping initialization.");
}

app.get("/image", async (_, res) => {
  const dataArray = await fetchData();
  res.send(JSON.stringify(dataArray));
});

type PlacePixelRequest = {
  x: number;
  y: number;
  color: {
    r: number;
    g: number;
    b: number;
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
    color.r > 255 ||
    color.g > 255 ||
    color.b > 255
  ) {
    log(`Invalid RGBA value found. rgba: {
      r: ${color.r}
      g: ${color.g}
      b: ${color.b}
    }`);
    return;
  }
  if (
    [color.r, color.g, color.b]
      .map((n) => Number.isInteger(n))
      .some((b: boolean) => !b)
  ) {
    log(
      `some value is not integer. r: ${color.r}, g: ${color.g}, b: ${color.b}`
    );
    return;
  }
  const first_idx = (IMAGE_WIDTH * y + x) * 4;
  data[first_idx] = color.r;
  data[first_idx + 1] = color.g;
  data[first_idx + 2] = color.b;
  data[first_idx + 3] = 255;
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

async function onPlacePixelRequest(ev: PlacePixelRequest) {
  log("socket event 'place-pixel' received.");
  log(ev);
  placePixel(ev);
  // of() is for namespaces, and to() is for rooms
  io.of("/").to("pixel-sync").emit("re-render", data);
  const idxNumber = ev.x + ev.y * IMAGE_WIDTH;
  await client.pixelColor.update({
    where: { id: idxNumber + 1, colIndex: ev.x, rowIndex: ev.y },
    data: {
      data: data.slice(idxNumber * 4, idxNumber * 4 + 3),
    },
  });
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
  5 * 60 * 1000
);

async function fetchData() {
  const data: number[] = [];
  for (let rowIndex = 0; rowIndex < IMAGE_HEIGHT; rowIndex++) {
    for (let colIndex = 0; colIndex < IMAGE_WIDTH; colIndex++) {
      const idNumber = rowIndex * IMAGE_WIDTH + colIndex;
      const result = await client.pixelColor.findUnique({
        where: { id: idNumber + 1, colIndex: colIndex, rowIndex: rowIndex },
      });
      if (result !== null) {
        data.push(result.data[0], result.data[1], result.data[2], 255);
      } else {
        log("failed to fetch pixel data");
        return;
      }
    }
  }
  return data;
}
// socket events need to be registered inside here.
// on connection is one of the few exceptions. (i don't know other exceptions though)
io.on("connection", async (socket) => {
  socket.join("pixel-sync");
  const dataArray = await fetchData();
  socket.emit("data", dataArray);
});

// since io.on("connection") cannot give cookies, we need to use io.engine.on("initial_headers"). think this as the same as io.on("connection") with some lower level control
// read https://socket.io/how-to/deal-with-cookies for more
io.engine.on("initial_headers", (headers, request) => {
  const cookies =
    request.headers.cookie && cookie.parse(request.headers.cookie);
  if (cookies) {
    const id = cookies["device-id"];
    if (id && idLastWrittenMap.has(id)) {
      // this device already has a cookie and the server recognizes the cookie
      log("Ignored a device that already has a cookie");
      return;
    }
  }

  // create crypto-safe random value (correct me if I'm wrong)
  const buf = crypto.randomBytes(32); // 32 bytes = 256 bits = 2 ^ 256 possibilities
  const hex = buf.toString("hex");
  headers["set-cookie"] = cookie.serialize("device-id", hex, {
    sameSite: COOKIE_SAME_SITE_RESTRICTION,
    maxAge: 3 * 24 * 60 * 60, // 3 days, komaba-fest proof ( I guess the server will become inactive and reset at night anyways)
    httpOnly: false,
    path: "/",
  });
  idLastWrittenMap.set(hex, Date.now());
  log("Granted a device an id");

  return;
});

app.put("/place-pixel", (req, res) => {
  if (!req.cookies) {
    res.status(400).send("Bad Request: cookie not found");
    log("Blocked a request: cookie not found");
    return;
  }
  log(req.cookies);
  const deviceId = req.cookies["device-id"];
  if (!deviceId) {
    res.status(400).send("Bad Request: cookie `device-id` not found");
    log("Blocked a request: cookie `device-id` not found");
    return;
  }
  const lastWrittenTime = idLastWrittenMap.get(deviceId);
  if (lastWrittenTime === undefined) {
    // if, by any chance, the server happened to crash and restart while being connected to the client, this might happen.
    res
      .status(400)
      .send("Bad Request: Unknown cookie. where did you get that from?");
    log("Blocked a request: unknown device id");
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
        `Bad Request: Last written time recorded in the server is less than ${BUTTON_COOLDOWN_SECONDS} seconds ago.`
      );
    log("Blocked a request: request too often");
    return;
  }
  idLastWrittenMap.set(deviceId, Date.now());

  let intermediateBufferDontMindMe: PlacePixelRequest | null = null;
  try {
    intermediateBufferDontMindMe = req.body as PlacePixelRequest;
  } catch (e) {
    res.status(400).send("Invalid request.");
    log("Blocked a request: invalid request body");
    return;
  }
  const ev = intermediateBufferDontMindMe;
  onPlacePixelRequest(ev);
  res.status(202).send("ok"); // since websocket will do the actual work, we just send status 202: Accepted
  log("Accepted a request: placed one pixel");
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

async function storeData(defaultArray: number[]) {
  for (let rowIndex = 0; rowIndex < IMAGE_HEIGHT; rowIndex++)
    for (let colIndex = 0; colIndex < IMAGE_WIDTH; colIndex++) {
      const idx = (rowIndex * IMAGE_WIDTH + colIndex) * 4;
      await client.pixelColor.create({
        data: {
          rowIndex: rowIndex,
          colIndex: colIndex,
          data: defaultArray.slice(idx, idx + 3),
        },
      });
    }
}
