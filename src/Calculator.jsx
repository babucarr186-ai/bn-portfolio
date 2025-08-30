import React, { useState } from "react";
import "./Calculator.css";

function Calculator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  const handleClick = (value) => {
    setInput((prev) => prev + value);
  };

  const handleClear = () => {
    setInput("");
    setResult("");
  };

  const handleCalculate = () => {
    try {
      // eslint-disable-next-line no-eval
      setResult(eval(input).toString());
    } catch {
      setResult("Error");
    }
  };

  return (
    <div className="calculator-container">
      <div className="display">
        <input type="text" value={input} readOnly />
        <div className="result">{result}</div>
      </div>
      <div className="buttons">
        {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"].map((btn) => (
          <button
            key={btn}
            onClick={() =>
              btn === "=" ? handleCalculate() : handleClick(btn)
            }
            className={btn === "=" ? "equals" : ""}
          >
            {btn}
          </button>
        ))}
        <button onClick={handleClear} className="clear">C</button>
      </div>
    </div>
  );
}

export default Calculator;
