import React, { useEffect, useState } from "react";
import { socket } from "./socket.js";
import { UpscaledImage } from "./zoom.tsx";
import "./App.css";
import rplaceLogo from "./assets/logo-art.png";

const BACKEND_URL = import.meta.env.VITE_API_ENDPOINT || "";
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
  [234, 145, 152],
  [218, 56, 50],
  [239, 133, 50],
  [255, 255, 0],
  [181, 228, 77],
  [82, 180, 234],
  [35, 59, 108],
  [103, 53, 147],
  [255, 255, 255],
];

function App() {
  // const [imageSrc, setImageSrc] = useState<string | null>(null); // eslint says it's not used
  const [imageData, setImageData] = useState<Uint8ClampedArray>(() =>
    new Uint8ClampedArray(IMAGE_DATA_LEN).fill(0),
  );

  const [selectedX, setSelectedX] = useState<number>(0);
  const [selectedY, setSelectedY] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<Color>(colors[0]);

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
    setImageData(Uint8ClampedArray.from(data));
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
          setSelectedY((y) => Math.max(y - 1, 0));
          break;
        case "ArrowDown":
          setSelectedY((y) => Math.min(y + 1, IMAGE_HEIGHT - 1));
          break;
        case "ArrowLeft":
          setSelectedX((x) => Math.max(x - 1, 0));
          break;
        case "ArrowRight":
          setSelectedX((x) => Math.min(x + 1, IMAGE_WIDTH - 1));
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
            Place Pixel
          </button>
        </div>
      ) : (
        <div className="unavailable-button-section">
          <div className="unavailable-button">
            <button
              className="gray-out-button"
              style={{
                "--progress-width": `${((BUTTON_COOLDOWN_SECONDS - clickCD) * 100) / 9}%`,
              }} // Adjust the progress width dynamically
              disabled
            >
              Place Pixel
            </button>
          </div>
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
  return fetch(BACKEND_URL + path).then((res) => res.json());
}

function put<T>(path: string, data: T) {
  fetch(BACKEND_URL + path, {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    method: "put",
    body: JSON.stringify(data),
  });
}
