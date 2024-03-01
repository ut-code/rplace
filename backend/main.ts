import express from "express";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

const app = express();

// switch environment variable on production
dotenv.config(process.env.NODE_ENV === "production" ? {
    path: ".env.production"
} : undefined);
app.use(cors({origin: process.env.WEB_ORIGIN}));

app.use(express.json());

// backend integration examples
let count = 0;
app.get("/count", (_, res) => {
    // send the res after 1 sec (not necessary at all)
    setTimeout(() => res.send({count}), 1000);
});
app.post("/add", (req, res) => {
    count += req.body.number;
    console.log(`count is ${count}`);
    res.send({count});
});

// socket io examples (TODO)
const io = new Server({
    cors: {
        origin: process.env.WEB_ORIGIN,
    },
});

io.on('connection', (socket) => {
 socket;
})

/* * * * * * */

const PORT = 3200;
app.listen(PORT, () => {
    console.log(`|backend| Listening on ${PORT}...`);
});
