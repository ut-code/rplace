import React, { useEffect, useState, useRef } from "react";
import { socket } from "./socket.js";
import { VITE_API_ENDPOINT } from "./env";
import { UpscaledImage } from "./zoom.tsx";
import "./App.css";
import rplaceLogo from "./assets/logo-art.png";

const BACKEND_URL = VITE_API_ENDPOINT;
const BUTTON_COOLDOWN_PROD = 10; // this fallback is used in release, because on render build command cannot access environment variables
const BUTTON_COOLDOWN_SECONDS =
  import.meta?.env?.VITE_BUTTON_COOLDOWN ?? BUTTON_COOLDOWN_PROD;
const IMAGE_HEIGHT = 16;
const IMAGE_WIDTH = 16;
const IMAGE_DATA_LEN = IMAGE_HEIGHT * IMAGE_WIDTH * 4;
const PIXEL_SIZE = 16;

type Color = number[];
const colors: Color[] = [
  [0, 0, 0],
  [218, 56, 50],
  [239, 133, 50],
  [181, 228, 77],
  [82, 180, 234],
  [103, 53, 147],
  [255, 255, 255],
];

function App() {
  // const [imageSrc, setImageSrc] = useState<string | null>(null); // eslint says it's not used
  const [gridColors, setGridColors] = useState<string[][]>([]);
  const [imageData, setImageData] = useState<Uint8ClampedArray>(() =>
    new Uint8ClampedArray(IMAGE_DATA_LEN).fill(0)
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

  const [selectedX, setSelectedX] = useState<number>(0);
  const [selectedY, setSelectedY] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<Color>([255, 255, 255]);

  // backend integration (with Cross-Origin Resource Share) example.
  function fetchImage() {
    // get() will parse the json inside
    get("/image").then((arr) => setImageData(arr));
  }
  // useEffect(_, []); will run on each load/reload (careful: without second arg, it would run whenever any existing variable changes)
  useEffect(() => {
    fetchImage();
  }, []);

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
      x: selectedX,
      y: selectedY,
      color: {
        r: selectedColor[0],
        g: selectedColor[1],
        b: selectedColor[2],
        a: 255,
      },
    };
    put("/place-pixel", ev);
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
      switch (event.key) {
        case "ArrowUp":
          setSelectedX((prevRow) => Math.max(prevRow - 1, 0));
          break;
        case "ArrowDown":
          setSelectedX((prevRow) => Math.min(prevRow + 1, IMAGE_HEIGHT - 1));
          break;
        case "ArrowLeft":
          setSelectedY((prevColumn) => Math.max(prevColumn - 1, 0));
          break;
        case "ArrowRight":
          setSelectedY((prevColumn) =>
            Math.min(prevColumn + 1, IMAGE_WIDTH - 1)
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
  }, [selectedX, selectedY]);

  const handleColorSelection = (color: Color) => {
    setSelectedColor(color);
    console.log("Selected color:", color);
  };

  function onImageClick(ev: React.MouseEvent): void {
    const x = ev.nativeEvent.offsetX;
    const y = ev.nativeEvent.offsetY;
    setSelectedX(Math.floor(x / PIXEL_SIZE));
    setSelectedY(Math.floor(y / PIXEL_SIZE));
    return;
  }

  return (
    <>
      <div className="header">
        <img src={rplaceLogo} className="logo" alt="logo" />
      </div>


      <UpscaledImage
        data={imageData}
        w={IMAGE_WIDTH}
        h={IMAGE_HEIGHT}
        ratio={PIXEL_SIZE}
        onClick={onImageClick}
        overlay={{
          coord: [selectedX, selectedY],
          color: selectedColor,
        }}
      />

      <div className="grid-container">
        <div className="selection-section">
          {`X: ${selectedX}, Y: ${selectedY}`}
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
        <div className="available-button-section">
        <button className="available-button" onClick={handlePlace}>
          Place!!!
        </button>
        <p>&nbsp;</p>
      </div>
      ) : (
        <div className="unavailable-button-section">
          <div className="unavailable-button">
            <button className="gray-out-button" disabled>
              Place!!!
            </button>
          </div>
          <p>PLEASE WAIT {clickCD} SECONDS BEFORE CLICK</p>
        </div>
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

async function get(path: string) {
  if (BACKEND_URL) {
    return await fetch(BACKEND_URL + path).then((res) => res.json());
  }
  return fetch(path).then((res) => res.json());
}

function put<T>(path: string, data: T) {
  fetch(BACKEND_URL + path, {
    method: "put",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
