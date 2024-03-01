import express from "express";
import { Server } from "socket.io";
import cors from "cors";

import { NODE_ENV, WEB_ORIGIN, VITE_API_ENDPOINT} from "./env";

const use = (...args: unknown[]) => {args;};
use(NODE_ENV, VITE_API_ENDPOINT);

const app = express();


app.use(cors({ origin: WEB_ORIGIN }));

app.use(express.json());

// backend integration examples
let count = 0;
app.get("/count", (_, res) => {
  // send the res after 1 sec (not necessary at all)
  setTimeout(() => res.send({ count }), 1000);
});
app.post("/add", (req, res) => {
  count += req.body.number;
  res.send({ count });
});

/* * * * * * */

const PORT = 3200;
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

let websocket_count = 0;
function onAddSocketCount(count: number) {
  console.log("socket event 'add-socket-count' received.");
  websocket_count += count;
  io.sockets.emit("update-socket-count", websocket_count);
}

// socket events need to be registered inside here.
// on connection is one of the few exceptions. (i don't know other exceptions though)
io.on("connection", (socket) => {
  socket.on("request-socket-count", () => {
    console.log("socket event 'request-socket-count' received.");
    socket.emit("respond-socket-count", websocket_count);
  });
  socket.on("add-socket-count", onAddSocketCount);
});
