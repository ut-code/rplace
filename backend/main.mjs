import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: process.env["WEB_ORIGIN"] }));

app.use(express.json());
app.use(express.static("dist"));

const PORT = 3000;
app.listen(PORT);
console.log(`Listening on port ${PORT}...`);

