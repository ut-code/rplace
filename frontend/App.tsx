import React, { useEffect } from "react";
import { useState } from "react";

import { socket } from "./socket.js";

import { VITE_API_ENDPOINT } from "./env";
import {IntoImage} from "./IntoImage.js";
import { zoom } from "./zoom.js";
import "./App.css";

const BACKEND_URL = VITE_API_ENDPOINT;
// requires CORS access perm refer main.ts (backend) for cors perm.

function App() {
  const [count, setCount] = useState<number | null>(null);
  const [socketCount, setSocketCount] = useState<number | null>(null);

  // backend integration (with Cross-Origin Resource Share) example.
  function fetchCount() {
    get("/count")
      .then((json) => json.count)
      .then(setCount);
  }
  // useEffect(_, []); will run on each load/reload (careful: without 2nd arg, it would run whenever any existing variable changes)
  useEffect(() => {
    fetchCount();
  }, []);

  // Socket.io example.
  useEffect(() => {
    function updateSocketCount(socketBasedCount: number) {
      setSocketCount(socketBasedCount);
    }

    function onRespondSocketCount(socketBasedCount: number) {
      console.log("socket event 'respond-socket-count' received.");
      setSocketCount(socketBasedCount);
    }

    socket.on("update-socket-count", updateSocketCount);
    socket.on("respond-socket-count", onRespondSocketCount);

    socket.emit("request-socket-count");

    // destructor: necessary, since events will duplicate without this.
    return () => {
      socket.off("update-socket-count", updateSocketCount);
      socket.off("respond-socket-count", onRespondSocketCount);
    };
  }, []);

  const w = 2;
  const h = 2;
  const ratio = 100;
  // const arr = createRandomArray(w, h);
  const arr = Uint8ClampedArray.from([
    255, 255, 0, 255,
    0, 255, 255, 255,
    255, 0, 255, 255,
    0, 255, 0, 255,
  ]);

  const long = zoom(arr, w, h, ratio);

  return (
    <>
      <IntoImage arr={long} w={w * ratio} h={h * ratio}></IntoImage>
      <div className="card">
        {count != null ? (
          <button
            onClick={() => {
              post("/add", { number: 1 }).then((json) => setCount(json.count));
            }}
          >
            count: {count}
          </button>
        ) : (
          <div> loading... </div>
        )}
        {socketCount == null ? (
          <>Loading WebSocket-based count...</>
        ) : (
          <button
            onClick={() => {
              socket.emit("add-socket-count", 1);
            }}
          >
            WebSocket-based count: {socketCount}
          </button>
        )}
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;

/// sends data in POST request using fetch API
async function post(path: string, data: object) {
  return await fetch(BACKEND_URL + path, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json());
}

async function get(path: string) {
  return await fetch(BACKEND_URL + path).then((res) => res.json());
}

function createRandomArray(width, height) {
	const arr = new Uint8ClampedArray(width * height * 4); 
	for (let h = 0; h < height; h++) {
		for (let w = 0; w < width; w++) {
			const idx = (h * width + w ) * 4;
			arr[idx] = w % 256; // Red
			arr[idx + 1] = h % 256; // Green
			arr[idx + 2] = idx % 256; // Blue
			arr[idx + 3] = 255; // Alpha (transparency)
		}
	}
	return arr;
}
