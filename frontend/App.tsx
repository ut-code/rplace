import React, { useEffect } from "react";
import { useState } from "react";

import { socket } from "./socket.js";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

const BACKEND_URL = import.meta.env.VITE_API_ENDPOINT;
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

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
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
