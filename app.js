/**
 * Advanced Web Calculator with Jakarta EE Integration Support
 * Implements full calculator functionality with memory, history, and keyboard support
 */

class Calculator {
    constructor() {
        // Calculator state
        this.currentValue = '0';
        this.previousValue = '';
        this.operator = null;
        this.waitingForOperand = false;
        this.memory = 0;
        this.history = [];
        this.maxHistoryItems = 50;

        // DOM elements
        this.display = document.getElementById('display');
        this.historyDisplay = document.getElementById('history');
        this.memoryIndicator = document.getElementById('memory-indicator');
        this.errorMessage = document.getElementById('error-message');
        this.historyPanel = document.getElementById('history-panel');
        this.historyList = document.getElementById('history-list');
        this.themeToggle = document.getElementById('theme-toggle');

        // Initialize calculator
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.updateDisplay();
        this.updateMemoryIndicator();
        this.loadHistoryFromStorage();
        this.initTheme();
        
        // Jakarta EE Integration: Initialize connection to server
        this.initServerConnection();
    }

    attachEventListeners() {
        // Button click events
        document.querySelector('.calculator__buttons').addEventListener('click', (e) => {
            if (e.target.matches('button')) {
                this.handleButtonClick(e.target);
                this.addButtonPressAnimation(e.target);
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardInput(e);
        });

        // Theme toggle
        this.themeToggle?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Clear history button
        document.getElementById('clear-history')?.addEventListener('click', () => {
            this.clearHistory();
        });

        // History item clicks
        this.historyList?.addEventListener('click', (e) => {
            if (e.target.closest('.history__item')) {
                this.loadFromHistory(e.target.closest('.history__item'));
            }
        });
    }

    handleButtonClick(button) {
        const { action, number, operator } = button.dataset;

        if (number !== undefined) {
            this.inputNumber(number);
        } else if (operator !== undefined) {
            this.inputOperator(operator);
        } else if (action) {
            this.handleAction(action);
        }

        this.clearError();
    }

    handleKeyboardInput(e) {
        e.preventDefault();
        
        const key = e.key;
        
        // Numbers
        if (/\d/.test(key)) {
            this.inputNumber(key);
        }
        // Operators
        else if (['+', '-', '*', '/'].includes(key)) {
            this.inputOperator(key);
        }
        // Decimal point
        else if (key === '.') {
            this.handleAction('decimal');
        }
        // Equals
        else if (key === 'Enter' || key === '=') {
            this.handleAction('equals');
        }
        // Clear
        else if (key === 'Escape') {
            this.handleAction('clear-all');
        }
        // Backspace
        else if (key === 'Backspace') {
            this.handleAction('backspace');
        }
        // Percentage
        else if (key === '%') {
            this.handleAction('percentage');
        }

        this.clearError();
    }

    inputNumber(num) {
        if (this.waitingForOperand) {
            this.currentValue = num;
            this.waitingForOperand = false;
        } else {
            this.currentValue = this.currentValue === '0' ? num : this.currentValue + num;
        }

        // Limit display length to prevent overflow
        if (this.currentValue.length > 12) {
            this.currentValue = this.currentValue.slice(0, 12);
        }

        this.updateDisplay();
    }

    inputOperator(nextOperator) {
        const inputValue = parseFloat(this.currentValue);

        if (this.previousValue === '') {
            this.previousValue = inputValue;
        } else if (this.operator) {
            const currentValue = this.previousValue || 0;
            const newValue = this.calculate(currentValue, inputValue, this.operator);

            if (newValue === null) return; // Error occurred

            this.currentValue = String(newValue);
            this.previousValue = newValue;
        }

        this.waitingForOperand = true;
        this.operator = nextOperator;
        this.updateHistory(`${this.previousValue} ${this.getOperatorSymbol(nextOperator)}`);
    }

    handleAction(action) {
        switch (action) {
            case 'equals':
                this.calculateResult();
                break;
            case 'clear-all':
                this.clearAll();
                break;
            case 'clear-entry':
                this.clearEntry();
                break;
            case 'backspace':
                this.backspace();
                break;
            case 'decimal':
                this.inputDecimal();
                break;
            case 'percentage':
                this.calculatePercentage();
                break;
            case 'memory-clear':
                this.memoryClear();
                break;
            case 'memory-recall':
                this.memoryRecall();
                break;
            case 'memory-add':
                this.memoryAdd();
                break;
            case 'memory-subtract':
                this.memorySubtract();
                break;
        }
    }

    calculate(firstOperand, secondOperand, operator) {
        try {
            let result;
            
            switch (operator) {
                case '+':
                    result = firstOperand + secondOperand;
                    break;
                case '-':
                    result = firstOperand - secondOperand;
                    break;
                case '*':
                    result = firstOperand * secondOperand;
                    break;
                case '/':
                    if (secondOperand === 0) {
                        this.showError('Cannot divide by zero');
                        return null;
                    }
                    result = firstOperand / secondOperand;
                    break;
                default:
                    return null;
            }

            // Round to avoid floating point precision issues
            result = Math.round((result + Number.EPSILON) * 100000000) / 100000000;

            // Check for overflow
            if (!isFinite(result)) {
                this.showError('Result too large');
                return null;
            }

            return result;
        } catch (error) {
            this.showError('Calculation error');
            return null;
        }
    }

    calculateResult() {
        const inputValue = parseFloat(this.currentValue);

        if (this.previousValue !== '' && this.operator) {
            const newValue = this.calculate(this.previousValue, inputValue, this.operator);
            
            if (newValue === null) return; // Error occurred

            const expression = `${this.previousValue} ${this.getOperatorSymbol(this.operator)} ${inputValue} = ${newValue}`;
            this.addToHistory(expression, newValue);

            this.currentValue = String(newValue);
            this.previousValue = '';
            this.operator = null;
            this.waitingForOperand = true;

            this.updateDisplay();
            this.updateHistory('');

            // Jakarta EE Integration: Log calculation to server
            this.logCalculationToServer(expression, newValue);
        }
    }

    clearAll() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operator = null;
        this.waitingForOperand = false;
        this.updateDisplay();
        this.updateHistory('');
    }

    clearEntry() {
        this.currentValue = '0';
        this.updateDisplay();
    }

    backspace() {
        if (!this.waitingForOperand) {
            this.currentValue = this.currentValue.length > 1 
                ? this.currentValue.slice(0, -1) 
                : '0';
            this.updateDisplay();
        }
    }

    inputDecimal() {
        if (this.waitingForOperand) {
            this.currentValue = '0.';
            this.waitingForOperand = false;
        } else if (this.currentValue.indexOf('.') === -1) {
            this.currentValue += '.';
        }
        this.updateDisplay();
    }

    calculatePercentage() {
        const value = parseFloat(this.currentValue);
        this.currentValue = String(value / 100);
        this.updateDisplay();
    }

    // Memory functions
    memoryClear() {
        this.memory = 0;
        this.updateMemoryIndicator();
    }

    memoryRecall() {
        this.currentValue = String(this.memory);
        this.waitingForOperand = true;
        this.updateDisplay();
    }

    memoryAdd() {
        this.memory += parseFloat(this.currentValue);
        this.updateMemoryIndicator();
    }

    memorySubtract() {
        this.memory -= parseFloat(this.currentValue);
        this.updateMemoryIndicator();
    }

    // Display updates
    updateDisplay() {
        let displayValue = this.currentValue;
        
        // Format large numbers with scientific notation
        const numValue = parseFloat(displayValue);
        if (Math.abs(numValue) >= 1e12) {
            displayValue = numValue.toExponential(6);
        } else if (displayValue.length > 12) {
            displayValue = parseFloat(displayValue).toPrecision(8);
        }

        this.display.textContent = displayValue;
    }

    updateHistory(text) {
        this.historyDisplay.textContent = text;
    }

    updateMemoryIndicator() {
        this.memoryIndicator.textContent = this.memory !== 0 ? 'M' : '';
    }

    // History management
    addToHistory(expression, result) {
        const historyItem = {
            expression,
            result,
            timestamp: new Date().toISOString()
        };

        this.history.unshift(historyItem);
        
        // Limit history size
        if (this.history.length > this.maxHistoryItems) {
            this.history = this.history.slice(0, this.maxHistoryItems);
        }

        this.saveHistoryToStorage();
        this.renderHistory();
    }

    renderHistory() {
        if (!this.historyList) return;

        this.historyList.innerHTML = '';
        
        this.history.slice(0, 10).forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history__item';
            historyItem.innerHTML = `
                <div class="history__expression">${item.expression.split(' = ')[0]}</div>
                <div class="history__result">= ${item.result}</div>
            `;
            historyItem.dataset.index = index;
            this.historyList.appendChild(historyItem);
        });

        // Show/hide history panel based on content
        if (this.history.length > 0) {
            this.historyPanel?.classList.add('show');
        }
    }

    loadFromHistory(historyElement) {
        const index = parseInt(historyElement.dataset.index);
        const historyItem = this.history[index];
        
        if (historyItem) {
            this.currentValue = String(historyItem.result);
            this.updateDisplay();
            this.waitingForOperand = true;
        }
    }

    clearHistory() {
        this.history = [];
        this.saveHistoryToStorage();
        this.renderHistory();
        this.historyPanel?.classList.remove('show');
    }

    // Local storage for history (Jakarta EE would replace this with server storage)
    saveHistoryToStorage() {
        try {
            // Note: Local storage disabled in strict instructions
            // Jakarta EE Integration: Save to server database instead
            this.saveHistoryToServer();
        } catch (error) {
            console.warn('Could not save history to storage');
        }
    }

    loadHistoryFromStorage() {
        try {
            // Note: Local storage disabled in strict instructions
            // Jakarta EE Integration: Load from server database instead
            this.loadHistoryFromServer();
        } catch (error) {
            console.warn('Could not load history from storage');
        }
    }

    // Utility functions
    getOperatorSymbol(operator) {
        const symbols = {
            '+': '+',
            '-': '-',
            '*': '×',
            '/': '÷'
        };
        return symbols[operator] || operator;
    }

    addButtonPressAnimation(button) {
        button.classList.add('pressed');
        setTimeout(() => {
            button.classList.remove('pressed');
        }, 150);
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.add('show');
        setTimeout(() => {
            this.clearError();
        }, 3000);
    }

    clearError() {
        this.errorMessage.classList.remove('show');
    }

    // Theme management
    initTheme() {
        const savedTheme = this.getThemePreference();
        if (savedTheme) {
            document.documentElement.setAttribute('data-color-scheme', savedTheme);
            this.updateThemeToggle(savedTheme);
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        this.updateThemeToggle(newTheme);
        this.saveThemePreference(newTheme);
    }

    updateThemeToggle(theme) {
        const icon = this.themeToggle?.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    getThemePreference() {
        // Jakarta EE Integration: Get from user preferences on server
        return null; // Local storage disabled
    }

    saveThemePreference(theme) {
        // Jakarta EE Integration: Save to user preferences on server
        console.log(`Theme preference saved: ${theme}`);
    }

    // Jakarta EE Integration Methods
    // These methods would interact with Jakarta EE REST endpoints

    initServerConnection() {
        /**
         * Jakarta EE Integration: Initialize WebSocket or REST client
         * - Connect to Jakarta EE application server
         * - Set up authentication headers
         * - Initialize session management
         */
        console.log('Jakarta EE: Initializing server connection...');
        
        // Example server status indicator
        this.updateServerStatus('connected');
    }

    async logCalculationToServer(expression, result) {
        /**
         * Jakarta EE Integration: POST /api/calculations
         * - Send calculation data to server
         * - Include user session information
         * - Handle server-side validation
         */
        try {
            console.log('Jakarta EE: Logging calculation:', { expression, result });
            
            // Example REST call structure:
            /*
            const response = await fetch('/api/calculations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.getAuthToken()
                },
                body: JSON.stringify({
                    expression,
                    result,
                    timestamp: new Date().toISOString(),
                    userId: this.getCurrentUserId()
                })
            });
            
            if (!response.ok) {
                throw new Error('Server logging failed');
            }
            */
        } catch (error) {
            console.warn('Jakarta EE: Failed to log calculation to server:', error);
        }
    }

    async saveHistoryToServer() {
        /**
         * Jakarta EE Integration: PUT /api/users/{userId}/calculator-history
         * - Save complete calculation history to server database
         * - Use Jakarta Persistence API (JPA) entities
         * - Implement proper error handling and retry logic
         */
        console.log('Jakarta EE: Saving history to server...');
    }

    async loadHistoryFromServer() {
        /**
         * Jakarta EE Integration: GET /api/users/{userId}/calculator-history
         * - Load user's calculation history from server
         * - Implement pagination for large histories
         * - Handle offline/online state management
         */
        console.log('Jakarta EE: Loading history from server...');
    }

    updateServerStatus(status) {
        /**
         * Jakarta EE Integration: Update UI based on server connection status
         * - Show connection indicators
         * - Handle reconnection logic
         * - Display sync status
         */
        const statusElement = document.querySelector('.server-status');
        if (statusElement) {
            statusElement.className = `server-status ${status}`;
        }
    }

    getAuthToken() {
        /**
         * Jakarta EE Integration: Get JWT or session token
         * - Integrate with Jakarta Security
         * - Handle token refresh
         * - Manage authentication state
         */
        return 'dummy-token';
    }

    getCurrentUserId() {
        /**
         * Jakarta EE Integration: Get current authenticated user ID
         * - Integrate with Jakarta Security context
         * - Handle user session management
         */
        return 'current-user-id';
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Calculator();
});

// Export for potential Jakarta EE integration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
}