import React, { useEffect } from "react";
import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

const BACKEND_URL = "http://localhost:3200";
// requires CORS access perm.

function App() {
  let [count, setCount] = useState<number | null>(0);

  // this is only run once on page load
  useEffect(() => {
    fetch(BACKEND_URL + "/count").then(res => res.json()).then(json => json.count).then(setCount);
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
        {count != null ? 
        <button onClick={() => {
          console.log("clicked");
          send(BACKEND_URL + "/add", { number: Math.random() }).then((json => setCount(json.count)))
          }}>
          count is {count}
        </button> : 
        <div> loading... </div> }

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

/// sends data in POST request
async function send(path: string, data: object) {
  return await fetch(path, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(res => res.json());
}