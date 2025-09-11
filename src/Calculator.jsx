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
  "1*2": "Suma waax deh! 😄",
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

function Calculator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const maxLength = 12; // Maximum input length

  const handleClick = (value) => {
    if (input.length >= maxLength) return;
    
    // Prevent multiple operators in sequence
    const lastChar = input.slice(-1);
    if (['+', '-', '*', '/'].includes(value) && ['+', '-', '*', '/'].includes(lastChar)) {
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
        setResult("Pmoney186 🇬🇲"); // Your signature
      } else if (input === "1*2") {
        setResult("BUBACAR NGET ⭐"); // Your full name
      } else if (input === "0*0") {
        // Random Gambian greeting
        setResult(greetings[Math.floor(Math.random() * greetings.length)]);
      } else if (jokes[input]) {
        // Show Wolof/Mandinka joke or phrase if it exists
        setResult(jokes[input]);
      } else {
        const calculatedResult = calculate(input);
        setResult(calculatedResult);
      }
    } catch {
      setResult("Error");
    }
  };

  // Handle keyboard input
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
    <div className="calculator-container" role="application" aria-label="Calculator">
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