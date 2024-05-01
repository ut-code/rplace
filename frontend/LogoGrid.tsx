import React from "react";

const lettersData = [
  // Letter 1
  [
    [1, 0, 0, 1, 1],
    [1, 0, 1, 0, 0],
    [1, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0]
  ],
  // Letter 2
  [
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0]
  ],
  // Letter 3
  [
    [1, 1, 1, 0, 0],
    [1, 0, 1, 0, 0],
    [1, 1, 1, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0]
  ],
  // Letter 4
  [
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1]
  ],
  // Letter 5
  [
    [0, 1, 1, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 0, 1, 1],
    [0, 1, 1, 0, 1],
    [0, 0, 0, 0, 1]
  ],
  // Letter 6
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0]
  ],
  // Letter 6
  [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 0]
  ]
];

const LogoGrid: React.FC = () => {
    return (
      <div className="logo-grid">
        {lettersData.map((letter) => (
          <div className="letter">
            {letter.map((row) => (
              <div className="row">
                {row.map((pixel) => (
                  <div className={`pixel ${pixel === 0 ? "black" : "white"}`} />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

export default LogoGrid;
