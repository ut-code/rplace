import React, { useEffect, useState, useRef } from "react";
import { socket } from "./socket.js";
import { VITE_API_ENDPOINT } from "./env";
import "./App.css";
import { createRandomArray } from "./image-array-sample/example.js";

const BACKEND_URL = VITE_API_ENDPOINT;

function App() {
  const [count, setCount] = useState<number | null>(null);
  const [socketCount, setSocketCount] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridColors, setGridColors] = useState<Uint8ClampedArray | null>(null);

  const rowSize = 16;
  const columnSize = 16;
  //const grid = Array(rowSize).fill(Array(columnSize).fill("#ffffff"));
  useEffect(() => {
    const colors = createRandomArray(columnSize, rowSize);
    setGridColors(colors);
  }, []);
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

  useEffect(() => {
    const colors = createRandomArray(columnSize, rowSize);
    setGridColors(colors);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedRow === null || selectedColumn === null) return;
      switch (event.key) {
        case "ArrowUp":
          setSelectedRow((prevRow) => Math.max(prevRow - 1, 0));
          break;
        case "ArrowDown":
          setSelectedRow((prevRow) => Math.min(prevRow + 1, rowSize - 1));
          break;
        case "ArrowLeft":
          setSelectedColumn((prevColumn) => Math.max(prevColumn - 1, 0));
          break;
        case "ArrowRight":
          setSelectedColumn((prevColumn) =>
            Math.min(prevColumn + 1, columnSize - 1)
          );
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedRow, selectedColumn]);

  const handleCellClick = (rowIndex: number, columnIndex: number) => {
    setSelectedRow(rowIndex);
    setSelectedColumn(columnIndex);
  };

  return (
    <>
      <h1>r/place</h1>
      <div className="grid-container">
        <div className="grid" style={{}} ref={gridRef}>
          {gridColors &&
            Array.from({ length: rowSize }, (_, rowIndex) => (
              <div key={rowIndex} className="grid-row">
                {Array.from({ length: columnSize }, (_, columnIndex) => {
                  const idx = (rowIndex * columnSize + columnIndex) * 4;
                  const r = gridColors[idx];
                  const g = gridColors[idx + 1];
                  const b = gridColors[idx + 2];
                  const color = `rgb(${r}, ${g}, ${b})`;

                  return (
                    <div
                      key={columnIndex}
                      className={`grid-cell ${
                        selectedRow === rowIndex &&
                        selectedColumn === columnIndex
                          ? "selected"
                          : ""
                      }`}
                      style={{
                        backgroundColor: color,
                      }}
                      onClick={() => handleCellClick(rowIndex, columnIndex)}
                    >
                      {selectedRow === rowIndex &&
                        selectedColumn === columnIndex && (
                          <div className="selected-circle" />
                        )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
        <div className="selection-section">
          {selectedRow !== null && selectedColumn !== null ? (
            <p>
              Selected pixel: Row{" "}
              {selectedRow !== null ? selectedRow + 1 : "N/A"}, Column{" "}
              {selectedColumn !== null ? selectedColumn + 1 : "N/A"}
            </p>
          ) : (
            <p>No pixel selected</p>
          )}
        </div>
      </div>
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

