/**
 * Simple Calculator - Modern Web UI
 * Handles both Standard Keypad and CLI Inquirer Simulation modes,
 * Keyboard shortcuts, Web Audio feedback, Theme toggle, and History.
 */

// --- Audio Synthesizer (Web Audio API) ---
class CalculatorAudio {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('calc-sound') !== 'false'; // default on
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('calc-sound', this.enabled);
    return this.enabled;
  }

  playClick(freq = 600, duration = 0.04) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  playChime() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25]; // C5 to E5 pleasant chord
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.2);
      });
    } catch (e) {}
  }

  playError() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }
}

// --- Calculator State Management ---
class CalculatorState {
  constructor() {
    this.currentValue = '0';
    this.previousValue = null;
    this.operator = null; // '+', '-', '*', '/'
    this.waitingForNewOperand = false;
    this.lastEvaluated = null;
    this.isErrorState = false;
  }

  reset() {
    this.currentValue = '0';
    this.previousValue = null;
    this.operator = null;
    this.waitingForNewOperand = false;
    this.lastEvaluated = null;
    this.isErrorState = false;
  }

  appendDigit(digit) {
    if (this.isErrorState) {
      this.reset();
    }
    if (this.waitingForNewOperand) {
      this.currentValue = digit;
      this.waitingForNewOperand = false;
      return;
    }
    if (this.currentValue === '0' && digit !== '.') {
      this.currentValue = digit;
    } else {
      // Limit length to avoid overflow
      if (this.currentValue.replace('-', '').length >= 15) return;
      this.currentValue += digit;
    }
  }

  appendDecimal() {
    if (this.isErrorState) {
      this.reset();
    }
    if (this.waitingForNewOperand) {
      this.currentValue = '0.';
      this.waitingForNewOperand = false;
      return;
    }
    if (!this.currentValue.includes('.')) {
      this.currentValue += '.';
    }
  }

  deleteDigit() {
    if (this.isErrorState) {
      this.reset();
      return;
    }
    if (this.waitingForNewOperand) return;
    if (this.currentValue.length === 1 || (this.currentValue.length === 2 && this.currentValue.startsWith('-'))) {
      this.currentValue = '0';
    } else {
      this.currentValue = this.currentValue.slice(0, -1);
    }
  }

  toggleSign() {
    if (this.isErrorState) return;
    if (this.currentValue === '0') return;
    if (this.currentValue.startsWith('-')) {
      this.currentValue = this.currentValue.slice(1);
    } else {
      this.currentValue = '-' + this.currentValue;
    }
  }

  percentage() {
    if (this.isErrorState) return;
    const num = parseFloat(this.currentValue);
    if (isNaN(num)) return;
    this.currentValue = this.cleanPrecision(num / 100).toString();
  }

  setOperator(nextOperator) {
    if (this.isErrorState) return;

    const currentNum = parseFloat(this.currentValue);

    if (this.operator && this.waitingForNewOperand) {
      // User is changing the operator before entering next operand
      this.operator = nextOperator;
      return;
    }

    if (this.previousValue === null && !isNaN(currentNum)) {
      this.previousValue = currentNum;
    } else if (this.operator) {
      const result = this.calculate(this.previousValue, currentNum, this.operator);
      if (result === null) {
        // Division by zero
        this.setError('Cannot divide by 0');
        return;
      }
      this.currentValue = this.cleanPrecision(result).toString();
      this.previousValue = result;
    }

    this.waitingForNewOperand = true;
    this.operator = nextOperator;
  }

  evaluate() {
    if (this.isErrorState) return null;
    if (this.operator === null || this.previousValue === null) {
      return null;
    }

    const currentNum = parseFloat(this.currentValue);
    const result = this.calculate(this.previousValue, currentNum, this.operator);

    if (result === null) {
      this.setError('Cannot divide by 0');
      return null;
    }

    const cleanedResult = this.cleanPrecision(result);
    const record = {
      first: this.previousValue,
      second: currentNum,
      operator: this.operator,
      result: cleanedResult,
      expression: `${this.formatNumber(this.previousValue)} ${this.operatorSymbol(this.operator)} ${this.formatNumber(currentNum)} =`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.lastEvaluated = record;
    this.currentValue = cleanedResult.toString();
    this.previousValue = null;
    this.operator = null;
    this.waitingForNewOperand = true;

    return record;
  }

  calculate(first, second, op) {
    switch (op) {
      case '+':
        return first + second;
      case '-':
        return first - second;
      case '*':
        return first * second;
      case '/':
        if (second === 0) return null;
        return first / second;
      default:
        return second;
    }
  }

  setError(msg) {
    this.isErrorState = true;
    this.currentValue = 'Error';
    this.previousValue = null;
    this.operator = null;
  }

  cleanPrecision(num) {
    // Avoid IEEE 754 precision issues like 0.1 + 0.2 = 0.30000000000000004
    return Math.round(num * 1e12) / 1e12;
  }

  operatorSymbol(op) {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      default: return op;
    }
  }

  formatNumber(num) {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('en-US', { maximumFractionDigits: 10 });
  }
}

// --- App Controller ---
document.addEventListener('DOMContentLoaded', () => {
  const audio = new CalculatorAudio();
  const state = new CalculatorState();

  // DOM Elements
  const primaryDisplay = document.getElementById('primaryDisplay');
  const expressionDisplay = document.getElementById('expressionDisplay');
  const errorPill = document.getElementById('errorPill');
  const errorMessage = document.getElementById('errorMessage');
  const screenToast = document.getElementById('screenToast');
  const screenToastText = document.getElementById('screenToastText');
  const copyResultBtn = document.getElementById('copyResultBtn');

  // Mode Elements
  const modeKeypadBtn = document.getElementById('modeKeypadBtn');
  const modeFormBtn = document.getElementById('modeFormBtn');
  const viewKeypad = document.getElementById('viewKeypad');
  const viewForm = document.getElementById('viewForm');

  // Sound & Theme
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIconOn = document.getElementById('soundIconOn');
  const soundIconOff = document.getElementById('soundIconOff');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');

  // History Drawer Elements
  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyDrawer = document.getElementById('historyDrawer');
  const historyBackdrop = document.getElementById('historyBackdrop');
  const historyList = document.getElementById('historyList');
  const historyEmptyState = document.getElementById('historyEmptyState');
  const historyCountBadge = document.getElementById('historyCountBadge');

  // Form Mode Elements
  const formFirstNumber = document.getElementById('formFirstNumber');
  const formSecondNumber = document.getElementById('formSecondNumber');
  const operatorChoices = document.querySelectorAll('.form-op-btn');
  const formCalculateBtn = document.getElementById('formCalculateBtn');
  const formResetBtn = document.getElementById('formResetBtn');
  const termFirst = document.getElementById('termFirst');
  const termSecond = document.getElementById('termSecond');
  const termOp = document.getElementById('termOp');
  const termResult = document.getElementById('termResult');

  let selectedFormOperator = 'Addition';
  let historyData = [];

  // Load persisted history
  try {
    const saved = localStorage.getItem('calc-history');
    if (saved) historyData = JSON.parse(saved);
  } catch (e) {
    historyData = [];
  }
  updateHistoryUI();

  // Initialize Sound Icon UI
  updateSoundIcon(audio.enabled);

  function updateSoundIcon(enabled) {
    if (enabled) {
      soundIconOn.classList.remove('hidden');
      soundIconOff.classList.add('hidden');
    } else {
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
    }
  }

  soundToggleBtn.addEventListener('click', () => {
    const isEnabled = audio.toggle();
    updateSoundIcon(isEnabled);
    showToast(isEnabled ? 'Sound turned On' : 'Sound Muted');
  });

  // --- Theme Management ---
  function applyTheme(isDark) {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
      localStorage.setItem('theme', 'light');
    }
  }

  // Theme Init
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    applyTheme(false);
  } else {
    // Default to dark mode for rich aesthetic
    applyTheme(true);
  }

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(!isDark);
    audio.playClick(900, 0.03);
  });

  // --- Display Updates ---
  function updateDisplay() {
    if (state.isErrorState) {
      primaryDisplay.textContent = state.currentValue;
      primaryDisplay.classList.add('text-rose-400');
      errorPill.classList.remove('hidden');
      document.getElementById('calculatorCard').classList.add('animate-shake');
      setTimeout(() => {
        document.getElementById('calculatorCard').classList.remove('animate-shake');
      }, 450);
      return;
    }

    primaryDisplay.classList.remove('text-rose-400');
    errorPill.classList.add('hidden');

    // Format current value with grouping if applicable
    primaryDisplay.textContent = state.currentValue;

    // Build expression display trail
    if (state.previousValue !== null && state.operator) {
      expressionDisplay.textContent = `${state.formatNumber(state.previousValue)} ${state.operatorSymbol(state.operator)}`;
    } else if (state.lastEvaluated) {
      expressionDisplay.textContent = state.lastEvaluated.expression;
    } else {
      expressionDisplay.textContent = '';
    }
  }

  function showToast(text) {
    screenToastText.textContent = text;
    screenToast.classList.remove('opacity-0');
    setTimeout(() => {
      screenToast.classList.add('opacity-0');
    }, 2200);
  }

  // Copy Result
  copyResultBtn.addEventListener('click', () => {
    const textToCopy = state.currentValue;
    navigator.clipboard.writeText(textToCopy).then(() => {
      audio.playChime();
      showToast(`Copied ${textToCopy} to clipboard!`);
    }).catch(() => {
      showToast('Failed to copy');
    });
  });

  // --- Keypad Buttons Interaction ---
  const keypadButtons = document.querySelectorAll('.calc-btn');

  keypadButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      handleButtonPress(btn);
    });
  });

  function handleButtonPress(btn) {
    // Add visual press effect
    btn.classList.add('btn-active-state');
    setTimeout(() => btn.classList.remove('btn-active-state'), 120);

    const num = btn.dataset.number;
    const op = btn.dataset.operator;
    const action = btn.dataset.action;

    if (num !== undefined) {
      audio.playClick(600);
      state.appendDigit(num);
      updateDisplay();
    } else if (op !== undefined) {
      audio.playClick(500);
      state.setOperator(op);
      updateDisplay();
    } else if (action !== undefined) {
      handleAction(action);
    }
  }

  function handleAction(action) {
    switch (action) {
      case 'clear':
        audio.playClick(350);
        state.reset();
        updateDisplay();
        break;
      case 'delete':
        audio.playClick(400);
        state.deleteDigit();
        updateDisplay();
        break;
      case 'decimal':
        audio.playClick(650);
        state.appendDecimal();
        updateDisplay();
        break;
      case 'toggle-sign':
        audio.playClick(550);
        state.toggleSign();
        updateDisplay();
        break;
      case 'percent':
        audio.playClick(550);
        state.percentage();
        updateDisplay();
        break;
      case 'equals':
        const record = state.evaluate();
        if (record) {
          audio.playChime();
          addHistoryRecord(record);
        } else if (state.isErrorState) {
          audio.playError();
        } else {
          audio.playClick(550);
        }
        updateDisplay();
        break;
    }
  }

  // --- Keyboard Support ---
  window.addEventListener('keydown', (e) => {
    // If user is typing in form inputs, allow normal typing
    if (e.target.tagName === 'INPUT') return;

    let targetBtn = null;

    if (e.key >= '0' && e.key <= '9') {
      targetBtn = document.getElementById(`key-${e.key}`);
      state.appendDigit(e.key);
      audio.playClick(600);
      updateDisplay();
    } else if (e.key === '.') {
      targetBtn = document.getElementById('key-decimal');
      state.appendDecimal();
      audio.playClick(650);
      updateDisplay();
    } else if (e.key === '+') {
      targetBtn = document.getElementById('key-add');
      state.setOperator('+');
      audio.playClick(500);
      updateDisplay();
    } else if (e.key === '-') {
      targetBtn = document.getElementById('key-subtract');
      state.setOperator('-');
      audio.playClick(500);
      updateDisplay();
    } else if (e.key === '*') {
      targetBtn = document.getElementById('key-multiply');
      state.setOperator('*');
      audio.playClick(500);
      updateDisplay();
    } else if (e.key === '/') {
      e.preventDefault(); // Prevent browser search hotkey
      targetBtn = document.getElementById('key-divide');
      state.setOperator('/');
      audio.playClick(500);
      updateDisplay();
    } else if (e.key === '%') {
      targetBtn = document.getElementById('key-percent');
      state.percentage();
      audio.playClick(550);
      updateDisplay();
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      targetBtn = document.getElementById('key-equals');
      const record = state.evaluate();
      if (record) {
        audio.playChime();
        addHistoryRecord(record);
      } else if (state.isErrorState) {
        audio.playError();
      } else {
        audio.playClick(550);
      }
      updateDisplay();
    } else if (e.key === 'Backspace') {
      targetBtn = document.getElementById('key-delete');
      state.deleteDigit();
      audio.playClick(400);
      updateDisplay();
    } else if (e.key === 'Escape') {
      targetBtn = document.getElementById('key-clear');
      state.reset();
      audio.playClick(350);
      updateDisplay();
    }

    if (targetBtn) {
      targetBtn.classList.add('btn-active-state');
      setTimeout(() => targetBtn.classList.remove('btn-active-state'), 120);
    }
  });

  // --- Mode Switching (Keypad vs Form Prompt) ---
  modeKeypadBtn.addEventListener('click', () => {
    switchMode('keypad');
  });

  modeFormBtn.addEventListener('click', () => {
    switchMode('form');
  });

  function switchMode(mode) {
    audio.playClick(750, 0.03);
    if (mode === 'keypad') {
      viewKeypad.classList.remove('hidden');
      viewForm.classList.add('hidden');

      modeKeypadBtn.className = 'flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-indigo-600 text-white shadow-md shadow-indigo-600/30';
      modeFormBtn.className = 'flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200';
    } else {
      viewKeypad.classList.add('hidden');
      viewForm.classList.remove('hidden');

      modeFormBtn.className = 'flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-indigo-600 text-white shadow-md shadow-indigo-600/30';
      modeKeypadBtn.className = 'flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200';
      
      // Auto-focus first input in form mode
      setTimeout(() => formFirstNumber.focus(), 50);
    }
  }

  // --- CLI Form Mode Logic ---
  operatorChoices.forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playClick(650);
      operatorChoices.forEach(b => {
        b.className = 'form-op-btn p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all';
      });
      btn.className = 'form-op-btn active p-2.5 rounded-xl border border-indigo-500 bg-indigo-600/20 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all';
      selectedFormOperator = btn.dataset.formOp;
      updateFormPreview();
    });
  });

  formFirstNumber.addEventListener('input', updateFormPreview);
  formSecondNumber.addEventListener('input', updateFormPreview);

  function updateFormPreview() {
    termFirst.textContent = formFirstNumber.value !== '' ? formFirstNumber.value : '--';
    termSecond.textContent = formSecondNumber.value !== '' ? formSecondNumber.value : '--';
    termOp.textContent = selectedFormOperator;
  }

  formCalculateBtn.addEventListener('click', () => {
    const val1 = formFirstNumber.value.trim();
    const val2 = formSecondNumber.value.trim();

    if (val1 === '' || val2 === '') {
      audio.playError();
      termResult.textContent = 'Error: Please enter both numbers';
      termResult.className = 'text-rose-400 font-bold text-sm tracking-wide';
      return;
    }

    const first = parseFloat(val1);
    const second = parseFloat(val2);

    let res;
    let opSymbol;

    // Logic exactly matching main.ts
    if (selectedFormOperator === 'Addition') {
      res = first + second;
      opSymbol = '+';
    } else if (selectedFormOperator === 'Subtraction') {
      res = first - second;
      opSymbol = '−';
    } else if (selectedFormOperator === 'Multiplication') {
      res = first * second;
      opSymbol = '×';
    } else if (selectedFormOperator === 'Division') {
      if (second === 0) {
        audio.playError();
        termResult.textContent = 'Error: Cannot divide by 0';
        termResult.className = 'text-rose-400 font-bold text-sm tracking-wide';
        return;
      }
      res = first / second;
      opSymbol = '÷';
    } else {
      termResult.textContent = 'Invalid operator.';
      return;
    }

    const cleanRes = state.cleanPrecision(res);
    termResult.textContent = cleanRes;
    termResult.className = 'text-emerald-400 font-bold text-sm tracking-wide animate-pulse';
    setTimeout(() => termResult.classList.remove('animate-pulse'), 800);

    audio.playChime();

    // Add to history
    const record = {
      first: first,
      second: second,
      operator: opSymbol,
      result: cleanRes,
      expression: `${state.formatNumber(first)} ${opSymbol} ${state.formatNumber(second)} =`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    addHistoryRecord(record);

    // Also sync to keypad display state so switching back is seamless
    state.currentValue = cleanRes.toString();
    state.waitingForNewOperand = true;
    state.lastEvaluated = record;
    updateDisplay();
  });

  formResetBtn.addEventListener('click', () => {
    audio.playClick(350);
    formFirstNumber.value = '';
    formSecondNumber.value = '';
    termFirst.textContent = '--';
    termSecond.textContent = '--';
    termResult.textContent = '--';
    termResult.className = 'text-emerald-400 font-bold text-sm tracking-wide';
  });

  // --- History Drawer & Storage ---
  function addHistoryRecord(record) {
    historyData.unshift(record);
    if (historyData.length > 25) historyData.pop();
    try {
      localStorage.setItem('calc-history', JSON.stringify(historyData));
    } catch (e) {}
    updateHistoryUI();
  }

  function updateHistoryUI() {
    historyCountBadge.textContent = historyData.length;
    
    if (historyData.length === 0) {
      historyEmptyState.classList.remove('hidden');
      historyList.innerHTML = '';
      return;
    }

    historyEmptyState.classList.add('hidden');
    historyList.innerHTML = '';

    historyData.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-800/40 cursor-pointer transition-all flex items-center justify-between group';
      card.innerHTML = `
        <div class="overflow-hidden pr-2">
          <div class="text-[11px] text-slate-400 font-mono truncate">${item.expression}</div>
          <div class="text-sm font-bold text-white font-mono group-hover:text-indigo-400 transition-colors">${item.result}</div>
        </div>
        <div class="text-[10px] text-slate-500 flex-shrink-0 font-mono">${item.timestamp}</div>
      `;
      card.addEventListener('click', () => {
        audio.playClick(600);
        state.currentValue = item.result.toString();
        state.waitingForNewOperand = true;
        state.lastEvaluated = item;
        updateDisplay();
        toggleHistory(false);
        showToast(`Loaded ${item.result} into calculator`);
      });
      historyList.appendChild(card);
    });
  }

  function toggleHistory(open) {
    audio.playClick(600, 0.03);
    if (open) {
      historyDrawer.classList.remove('translate-x-full');
      historyBackdrop.classList.remove('hidden');
    } else {
      historyDrawer.classList.add('translate-x-full');
      historyBackdrop.classList.add('hidden');
    }
  }

  historyToggleBtn.addEventListener('click', () => toggleHistory(true));
  closeHistoryBtn.addEventListener('click', () => toggleHistory(false));
  historyBackdrop.addEventListener('click', () => toggleHistory(false));

  clearHistoryBtn.addEventListener('click', () => {
    audio.playClick(350);
    historyData = [];
    localStorage.removeItem('calc-history');
    updateHistoryUI();
    showToast('History cleared');
  });

  // Initial display render
  updateDisplay();
});
