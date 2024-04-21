import React, { useEffect, useState, useRef, useMemo } from "react";
import { socket } from "./socket.js";
import { VITE_API_ENDPOINT } from "./env";
import { IntoImage } from "./IntoImage.js";
import { ZoomedImage } from "./zoom.tsx";
import "./App.css";
import { createImageURI } from "./image-array";

const BACKEND_URL = VITE_API_ENDPOINT;
const BUTTON_COOLDOWN_PROD = 10; // this fallback is used in release, because on render build command cannot access environment variables
const BUTTON_COOLDOWN_SECONDS = import.meta?.env?.VITE_BUTTON_COOLDOWN || BUTTON_COOLDOWN_PROD; 
const IMAGE_HEIGHT = 16;
const IMAGE_WIDTH = 16;
const IMAGE_DATA_LEN = IMAGE_HEIGHT * IMAGE_WIDTH * 4;

type Color = number[];
const colors: Color[] = [
  [255, 255, 255], // white
  [0, 255, 255],
  [0, 0, 255],
  [255, 0, 255],
  [255, 0, 0],
  [255, 255, 0],
  [0, 255, 0],
  [0, 0, 0], // black
];

function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [gridColors, setGridColors] = useState<string[][]>([]);
  const [imageData, setImageData] = useState<number[]>(
    () => new Array(IMAGE_DATA_LEN).fill(0),
  );
  useEffect(() => {
    // Call setImageData to generate the image data

    // Extract colors from the generated image data and update grid colors
    const colors: string[][] = [];
    for (let i = 0; i < IMAGE_HEIGHT; i++) {
      const rowColors: string[] = [];
      for (let j = 0; j < IMAGE_WIDTH; j++) {
        const idx = (IMAGE_WIDTH * i + j) * 4;
        const arr = imageData.slice(idx, idx + 4);
        const color = `rgba(${arr[0]}, ${arr[1]}, ${arr[2]}, ${arr[3]})`;
        rowColors.push(color);
      }
      colors.push(rowColors);
    }
    setGridColors(colors);
  }, [imageData]);

  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedColor, setSelectedColor] = useState<Color>([255, 255, 255]);

  // backend integration (with Cross-Origin Resource Share) example.
  function fetchImage() {
    // get() will parse the json inside
    get("/image").then((arr) => setImageData(Uint8ClampedArray.from(arr)));
  }
  // useEffect(_, []); will run on each load/reload (careful: without second arg, it would run whenever any existing variable changes)
  useEffect(() => {
    fetchImage();
  }, []);

  // Socket.io example.
  function onReRender(data: number[]) {
    // TODO!
    console.log("rerender", data.length);
    setImageData(Uint8ClampedArray.from(data));
    console.log("re-render request received!");
  }

  const [clickCD, setClickCD] = useState<number>(BUTTON_COOLDOWN_SECONDS);
  useEffect(() => {
    const id = setTimeout(() => setClickCD(clickCD - 1), 1000);
    return () => clearTimeout(id);
  }, [clickCD]);

  function handlePlace() {
    const ev = {
      x: selectedColumn,
      y: selectedRow,
      color: {
        r: selectedColor[0],
        g: selectedColor[1],
        b: selectedColor[2],
        a: 255,
      },
    };
    socket.emit("place-pixel", ev);
    setClickCD(BUTTON_COOLDOWN_SECONDS);
  }

  useEffect(() => {
    socket.on("re-render", onReRender);

    return () => {
      socket.off("re-render", onReRender);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedRow === null || selectedColumn === null) return;
      switch (event.key) {
        case "ArrowUp":
          setSelectedRow((prevRow) => Math.max(prevRow - 1, 0));
          break;
        case "ArrowDown":
          setSelectedRow((prevRow) => Math.min(prevRow + 1, IMAGE_HEIGHT - 1));
          break;
        case "ArrowLeft":
          setSelectedColumn((prevColumn) => Math.max(prevColumn - 1, 0));
          break;
        case "ArrowRight":
          setSelectedColumn((prevColumn) =>
            Math.min(prevColumn + 1, IMAGE_WIDTH - 1),
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

  const handleColorSelection = (color: string) => {
    setSelectedColor(color);
    console.log("Selected color:", color);
  };

  const handleCellClick = (rowIndex: number, columnIndex: number) => {
    setSelectedRow(rowIndex);
    setSelectedColumn(columnIndex);
  };

  return (
    <>
      <h1>r/place</h1>
      <ZoomedImage
        data={imageData}
        w={IMAGE_WIDTH}
        h={IMAGE_HEIGHT}
        ratio={16}
      />
      <div className="grid-container">
        <div className="grid" style={{}} ref={gridRef}>
          {gridColors.map((rowColors, rowIndex) => (
            <div key={rowIndex} className="grid-row">
              {rowColors.map((color, columnIndex) => (
                <div
                  key={columnIndex}
                  className="grid-cell"
                  style={{ backgroundColor: color }}
                  onClick={() => handleCellClick(rowIndex, columnIndex)}
                >
                  {selectedRow === rowIndex &&
                    selectedColumn === columnIndex && (
                      <div
                        className="selected-box"
                        style={{ backgroundColor: rgb(selectedColor) || undefined }}
                      />
                    )}
                </div>
              ))}
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
      <div className="color-selection">
        {colors.map((color, index) => (
          <div
            key={index}
            className={`color-box ${selectedColor === color ? "selected" : ""}`}
            style={{ backgroundColor: rgb(color) }}
            onClick={() => handleColorSelection(color)}
          />
        ))}
      </div>
      {clickCD <= 0 ? (
        <button onClick={handlePlace}>Place!!!</button>
      ) : (
        <div>PLEASE WAIT {clickCD} SECONDS BEFOR CLIK</div>
      )}
    </>
  );
}

export default App;

function rgb(color: Color): string {
  return (
    "#" + twoDigitHex(color[0]) + twoDigitHex(color[1]) + twoDigitHex(color[2])
  );
}
function twoDigitHex(n: number): string {
  return hex(n).padStart(2, "0");
}
function hex(n: number): string {
  return n.toString(16); // wtf
}

/// sends data in POST request using fetch API
async function post(path: string, data: object) {
  return await fetch(BACKEND_URL + path, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.json());
}

async function get(path: string) {
  if (BACKEND_URL) {
    return await fetch(BACKEND_URL + path).then((res) => res.json());
  }
  return fetch(path).then((res) => res.json());
}

function createRandomArray(width: number, height: number) {
  const arr = new Array(width * height * 4);
  for (let h = 0; h < height; h++) {
    for (let w = 0; w < width; w++) {
      const idx = (h * width + w) * 4;
      arr[idx] = (16 * w) % 256; // Red
      arr[idx + 1] = (16 * h) % 256; // Green
      arr[idx + 2] = (16 * idx) % 256; // Blue
      arr[idx + 3] = 255; // Alpha (transparency)
    }
  }
  return arr;
}
function inspect<T>(target: T): T {
  console.log(target);
  return target;
}
