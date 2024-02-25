import express from "express";
import cors from "cors";
import dotenv from "dotenv";

const app = express();

// switch environment variable on production
dotenv.config(process.env.NODE_ENV === "production" ? {
    path: ".env.production"
} : undefined);
app.use(cors({origin: process.env.WEB_ORIGIN}));

app.use(express.json());

let count = 0;
app.get("/count", (_, res) => {
    res.send({count});
});
app.post("/add", (req, res) => {
    count += req.body.number;
    console.log(`count is ${count}`);
    res.send({count});
})

const PORT = 3200;
app.listen(PORT, 'localhost', () => {
    console.log(`|backend| Listening on ${PORT}...`);
});
