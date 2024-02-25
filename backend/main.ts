import express from "express";
import cors from "cors";

// const FRONTEND_URL = "http://localhost:5173";

const app = express();
/* {
    origin: FRONTEND_URL,
}; */

app.use(cors());
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
