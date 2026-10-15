# 🧮 Simple Calculator

A versatile, open-source calculator project featuring both an **interactive Node.js CLI** (powered by `inquirer` & TypeScript) and a **modern, responsive Web UI** (crafted with Tailwind CSS & Vanilla JavaScript).

---

## ✨ Features

### 🌐 Modern Web UI
- **Tailwind CSS via CDN:** Lightweight and dependency-free, running smoothly without extra build steps or bundling overhead.
- **Dual Operating Modes:**
  - **Keypad Mode:** Full-featured modern calculator with standard grid buttons (`0-9`, `.`, `+`, `−`, `×`, `÷`, `%`, `±`, `AC`, `DEL`, `=`).
  - **CLI Prompt Mode:** Seamlessly mirrors the original CLI mental model. Select your operator (`Addition`, `Subtraction`, `Multiplication`, `Division`), input the two numbers, and watch a live terminal animation preview the output.
- **Full Keyboard Navigation:**
  - Numbers `0-9` and decimal `.`
  - Operators: `+`, `-`, `*`, `/`, `%`
  - Calculation: `Enter` or `=`
  - Clear / Delete: `Escape` (All Clear / AC), `Backspace` (DEL)
  - Visual feedback on virtual buttons whenever a corresponding keyboard key is pressed.
- **Dark / Light Theme:** Persistent theme toggling with curated slate/zinc tones, glassmorphism card styling, and ambient gradients.
- **Interactive Audio Feedback:** Optional synthesized Web Audio clicks, chime chords on successful calculation, and soft alerts on errors (toggleable and persisted in `localStorage`).
- **Calculation History:** Slide-over drawer recording recent calculations with expressions and timestamps. Click any past calculation to instantly recall the result into your active display.
- **Edge Case Protection:**
  - Robust division-by-zero handling with visual alert feedback.
  - Floating point precision normalization (e.g., `0.1 + 0.2 = 0.3`).
  - One-click copy result to clipboard.

### 💻 Original Interactive CLI
- Built with TypeScript and `inquirer`.
- Prompts for `firstNumber`, `secondNumber`, and an operator from `["Addition", "Subtraction", "Multiplication", "Division"]`.
- 100% backward-compatible: existing CLI scripts and build configurations remain fully functional and untouched.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- `npm`

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/maryesivue-arch/Simple-calculator.git
cd Simple-calculator
npm install
```

---

## 🖥️ Running the CLI Calculator

You can run the terminal prompt calculator directly:

```bash
# Using Node directly:
node main.js

# Or using the npm start script:
npm start
```

If you make modifications to `main.ts`, recompile it using:
```bash
npm run build
# Or directly with tsc:
npx tsc
```

---

## 🌐 Launching the Web UI

You have several easy options to launch and preview the Web UI:

### Option 1: Via npm dev server (Recommended)
```bash
npm run dev
```
*(Runs a local HTTP server at `http://localhost:3000` or the next available port using `npx serve`)*

### Option 2: Direct local HTTP server
```bash
npx serve .
```

### Option 3: Open directly in your browser
Simply double-click [index.html](file:///Users/esivue/Desktop/fifth%20contri/Simple-calculator/index.html) or run on macOS:
```bash
open index.html
```

---

## ⌨️ Keyboard Shortcuts Reference

| Key | Action |
| :--- | :--- |
| `0` – `9` | Input Digits |
| `.` | Decimal separator |
| `+` | Addition |
| `-` | Subtraction |
| `*` | Multiplication |
| `/` | Division |
| `%` | Percentage |
| `Enter` or `=` | Calculate Result |
| `Backspace` | Delete last digit (DEL) |
| `Escape` | Reset calculator (AC) |

---

## 📁 Project Structure

```text
Simple-calculator/
├── index.html       # Modern Web UI interface (Tailwind CSS CDN)
├── script.js        # Web UI controller, arithmetic engine & audio synthesizer
├── main.ts          # Original TypeScript CLI implementation (Inquirer)
├── main.js          # Compiled JavaScript CLI executable
├── tsconfig.json    # TypeScript compiler configuration
├── package.json     # Node.js manifest with dev, start, build scripts
└── README.md        # Project documentation
```

---

## 📄 License
ISC License.
