import React, { useEffect, useState, useRef, useMemo } from "react";
import { socket } from "./socket.js";
import { VITE_API_ENDPOINT } from "./env";
import { IntoImage } from "./IntoImage.js";
import { zoom } from "./zoom.js";
import "./App.css";
import { createImageURI } from "./image-array";

const BACKEND_URL = VITE_API_ENDPOINT;

function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [gridColors, setGridColors] = useState<string[][]>([]);
  useEffect(() => {
    // Call setImageData to generate the image data
    const width = 16,
      height = 16;
    const arr = createRandomArray(width, height);
    const imageDataSrc = createImageURI(arr, width, height);
    setImageSrc(imageDataSrc);

    // Extract colors from the generated image data and update grid colors
    const colors: string[][] = [];
    for (let i = 0; i < height; i++) {
      const rowColors: string[] = [];
      for (let j = 0; j < width; j++) {
        const idx = (i * width + j) * 4;
        const color = `rgba(${arr[idx]}, ${arr[idx + 1]}, ${arr[idx + 2]}, ${arr[idx + 3]})`;
        rowColors.push(color);
      }
      colors.push(rowColors);
    }
    setGridColors(colors);
  }, []);

  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const IMAGE_HEIGHT = 16;
  const IMAGE_WIDTH = 16;
  const IMAGE_DATA_LEN = IMAGE_HEIGHT * IMAGE_WIDTH * 4;
  const [imageData, setImageData] = useState<number[]>(new Array(IMAGE_DATA_LEN).fill(0));

  // Define a function 'chunk' to split an array into smaller chunks of a specified size
  // DANGER: NOT WORKING!!!
  function splitIntoChunks<T>(arr: T[], size: number) {
    // Use Array.from to create a new array with a length equal to the number of chunks needed
    return Array.from({length: Math.ceil(arr.length / size)}, (_, i) => {
        return arr.slice(i * size, i * size + size);
      }
    );
  }

  // backend integration (with Cross-Origin Resource Share) example.
  function fetchImage() {
    // get() will parse the json inside
    get("/image")
      .then(arr => setImageData(Uint8ClampedArray.from(arr)));
  }
  // useEffect(_, []); will run on each load/reload (careful: without second arg, it would run whenever any existing variable changes)
  useEffect(() => {
    fetchImage();
  }, []);

  // Socket.io example.
  function onReRender(data: number[]) {
    // TODO!
    console.log("rerender", data.length)
    setImageData(Uint8ClampedArray.from(data));
    console.log("re-render request was sent!");
  }

  function handlePlace() {
    const ev = {
      x: 3, // GET X FROM SOMEWHERE
      y: 4, // GET Y FROM SOMEWHERE
      color: {
        r: 100, // GET Red FROM SOMEWHERE
        g: 200, // GET Green FROM SOMEWHERE
        b: 0, // GET Blue FROM SOMEWHERE
        a: 255,
      },
    };
    socket.emit("place-pixel", ev);
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

  const colors = ["red", "orange", "yellow", "green", "blue", "purple"];
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
      <IntoImage arr={imageData} w={IMAGE_WIDTH} h={IMAGE_HEIGHT} />
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
                        style={{ backgroundColor: selectedColor || undefined }}
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
            style={{ backgroundColor: color }}
            onClick={() => handleColorSelection(color)}
          />
        ))}
      </div>
      <button onClick={handlePlace}>Place!!!</button>
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
