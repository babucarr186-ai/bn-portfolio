import React, { useState } from "react";
import "./Calculator.css";

const calculate = (expression) => {
  // Remove any whitespace and validate input
  const sanitized = expression.replace(/\s/g, '');
  if (!/^[0-9+\-*/.()]+$/.test(sanitized)) {
    return 'Error';
  }

  // Split the expression into numbers and operators
  const numbers = sanitized.split(/[+\-*/]/).map(Number);
  const operators = sanitized.split(/[0-9.]+/).filter(op => op);

  if (numbers.some(isNaN)) return 'Error';

  let result = numbers[0];
  for (let i = 0; i < operators.length; i++) {
    const nextNum = numbers[i + 1];
    switch (operators[i]) {
      case '+': result += nextNum; break;
      case '-': result -= nextNum; break;
      case '*': result *= nextNum; break;
      case '/': 
        if (nextNum === 0) return 'Error';
        result /= nextNum; 
        break;
      default: return 'Error';
    }
  }
  return result.toString();
};

// Gambian greeting messages and jokes
const greetings = [
  "Kasumay! 🇬🇲",
  "Nanga def! 🇬🇲",
  "I bi siimaaya! 🇬🇲",
  "On fleek! 🇬🇲"
];

// Wolof and Mandinka jokes and phrases
const jokes = {
  "1*1": "Pmoney186 🇬🇲",
  "1*2": "BUBACAR NGET ⭐",
  "0*0": "(Random Greeting)", // marker; handled separately
  "2*2": "Kata kata! 🎵",
  "3*3": "I be jeleh jeleh! 🌟",
  "4*4": "Mbolo mbolo! 🤝",
  "5*5": "Dama fees! 😊",
  "6*6": "A be barama! ✨",
  "7*7": "Deh wahay! 🎉",
  "8*8": "Ning sering! 👋",
  "9*9": "Alhamdulillah! 🙏",
  "2*5": "Waaw waaw! 😎",
  "3*5": "Foneh foneh! 💃",
  "4*5": "Jarama! 🙌",
  "5*6": "A be siiring! 🌴",
  "6*7": "Yangi dox? 👟",
  "7*8": "Dama ress! 😂"
};

const jokeOrder = ["1*1","1*2","0*0","2*2","3*3","4*4","5*5","6*6","7*7","8*8","9*9","2*5","3*5","4*5","5*6","6*7","7*8"]; // display order

function Calculator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [showHints, setShowHints] = useState(false);
  const maxLength = 12; // Maximum input length

  const handleClick = (value) => {
    if (input.length >= maxLength) return;
    const lastChar = input.slice(-1);
    if (["+","-","*","/"].includes(value) && ["+","-","*","/"].includes(lastChar)) {
      return;
    }
    setInput((prev) => prev + value);
  };

  const handleClear = () => {
    setInput("");
    setResult("");
  };

  const handleCalculate = () => {
    try {
      if (input === "1*1") {
        setResult("Pmoney186 🇬🇲");
      } else if (input === "1*2") {
        setResult("BUBACAR NGET ⭐");
      } else if (input === "0*0") {
        setResult(greetings[Math.floor(Math.random() * greetings.length)]);
      } else if (jokes[input] && input !== "0*0") {
        setResult(jokes[input]);
      } else {
        const calculatedResult = calculate(input);
        setResult(calculatedResult);
      }
    } catch {
      setResult("Error");
    }
  };

  const surprise = () => {
    const pool = jokeOrder.filter(code => code !== "0*0");
    const pick = pool[Math.floor(Math.random()*pool.length)];
    setInput(pick);
    // auto calculate
    setTimeout(() => handleCalculate(), 0);
  };

  React.useEffect(() => {
    const handleKeyPress = (e) => {
      const key = e.key;
      if (/[0-9+\-*/.=]/.test(key)) {
        e.preventDefault();
        if (key === '=' || key === 'Enter') {
          handleCalculate();
        } else {
          handleClick(key);
        }
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [input]);

  return (
    <div className="calculator-container" role="application" aria-label="Joke Calculator">
      <div className="calc-header">
        <h3 className="calc-title">Joke Calculator <span aria-hidden>😄</span></h3>
        <button
          type="button"
          className="hint-toggle"
            aria-expanded={showHints}
          aria-controls="joke-hints"
          onClick={() => setShowHints(s => !s)}
        >
          {showHints ? 'Hide Examples' : 'Show Joke Examples'}
        </button>
        <button
          type="button"
          className="surprise-btn"
          onClick={surprise}
          aria-label="Show a random joke result"
        >Surprise Me</button>
      </div>
      {showHints && (
        <div id="joke-hints" className="hints" aria-live="polite">
          <p className="hints-intro">Type these multiplications and press = :</p>
          <ul className="hints-list">
            {jokeOrder.map(code => (
              <li key={code}>
                <button
                  type="button"
                  className="hint-code"
                  onClick={() => { setInput(code); setTimeout(() => handleCalculate(),0); }}
                  aria-label={`Use ${code} to get a joke`}
                >{code}</button>
                <span className="hint-preview">→ {code === "0*0" ? 'Random greeting' : jokes[code]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="display">
        <input
          type="text"
          value={input}
          readOnly
          aria-label="Calculator input"
          aria-live="polite"
        />
        <div className="result" aria-label="Calculator result" role="status">
          {result}
        </div>
      </div>
      <div className="buttons" role="group" aria-label="Calculator buttons">
        {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"].map((btn) => (
          <button
            key={btn}
            onClick={() =>
              btn === "=" ? handleCalculate() : handleClick(btn)
            }
            className={btn === "=" ? "equals" : ""}
            aria-label={btn === "=" ? "Calculate" : btn}
          >
            {btn}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="clear"
          aria-label="Clear calculator"
        >
          C
        </button>
      </div>
    </div>
  );
}

export default Calculator;