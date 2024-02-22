import express from "express";

const app = express();

app.use(express.json());
app.use(express.static("dist"));

const PORT = 3200;
app.listen(PORT);
console.log(`|backend| Listening on port ${PORT}...`);
