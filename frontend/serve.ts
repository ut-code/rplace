import express from "express";

const app = express();

app.use(express.static("./vite-dist"));

const PORT = 3100;
app.listen(PORT);
console.log(`|frontend| Listening on ${PORT}`);
