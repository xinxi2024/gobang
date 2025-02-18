class GomokuGame {
    constructor() {
        this.canvas = document.getElementById('gameBoard');
        this.ctx = this.canvas.getContext('2d');
        this.boardSize = 15;
        this.cellSize = this.canvas.width / this.boardSize;
        this.gameMode = null;
        this.difficulty = null;
        this.currentPlayer = 'black';
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        this.history = [];
        this.undoCount = 3;
        this.gameStarted = false;
        this.winner = null;
        this.previewPosition = { x: 7, y: 7 }; // 预览位置初始化在棋盘中心

        this.initializeEventListeners();
        this.initializeThemes();
    }

    initializeEventListeners() {
        // 游戏模式选择
        document.getElementById('pvpMode').addEventListener('click', () => this.selectGameMode('pvp'));
        document.getElementById('pveMode').addEventListener('click', () => this.selectGameMode('pve'));

        // AI难度选择
        document.querySelectorAll('.difficulty-selection button').forEach(button => {
            button.addEventListener('click', () => this.selectDifficulty(button.dataset.difficulty));
        });

        // 主题切换
        document.getElementById('themeSelect').addEventListener('change', (e) => this.changeTheme(e.target.value));

        // 游戏控制
        document.getElementById('undoButton').addEventListener('click', () => this.undo());
        document.getElementById('restartButton').addEventListener('click', () => this.restart());
        document.getElementById('backToMenu').addEventListener('click', () => this.backToMenu());
        document.getElementById('showRules').addEventListener('click', () => this.showRules());

        // 棋盘点击
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    initializeThemes() {
        this.themes = {
            classic: {
                board: '#f0f0f0',
                lines: '#000000',
                black: '#000000',
                white: '#ffffff'
            },
            wooden: {
                board: '#deb887',
                lines: '#8b4513',
                black: '#000000',
                white: '#ffffff'
            },
            colorful: {
                board: '#4ecdc4',
                lines: '#2c3e50',
                black: '#e74c3c',
                white: '#f1c40f'
            }
        };
        this.currentTheme = 'classic';
        this.drawBoard();
    }

    selectGameMode(mode) {
        this.gameMode = mode;
        document.getElementById('gameModeSelection').style.display = 'none';
        if (mode === 'pve') {
            document.getElementById('difficultySelection').style.display = 'block';
        } else {
            this.startGame();
        }
    }

    selectDifficulty(difficulty) {
        this.difficulty = difficulty;
        document.getElementById('difficultySelection').style.display = 'none';
        this.startGame();
    }

    startGame() {
        this.gameStarted = true;
        document.querySelector('.game-area').style.display = 'block';
        this.drawBoard();
    }

    changeTheme(theme) {
        this.currentTheme = theme;
        document.body.className = `theme-${theme}`;
        this.drawBoard();
        if (this.history.length > 0) {
            this.history.forEach(move => {
                this.drawPiece(move.x, move.y, move.player);
            });
        }
    }

    drawBoard() {
        const theme = this.themes[this.currentTheme];
        
        // 绘制棋盘背景
        this.ctx.fillStyle = theme.board;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格线
        this.ctx.strokeStyle = theme.lines;
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.boardSize; i++) {
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(this.cellSize / 2, i * this.cellSize + this.cellSize / 2);
            this.ctx.lineTo(this.canvas.width - this.cellSize / 2, i * this.cellSize + this.cellSize / 2);
            this.ctx.stroke();

            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize + this.cellSize / 2, this.cellSize / 2);
            this.ctx.lineTo(i * this.cellSize + this.cellSize / 2, this.canvas.height - this.cellSize / 2);
            this.ctx.stroke();
        }

        // 绘制预览位置
        if (this.gameStarted && !this.winner) {
            const centerX = this.previewPosition.x * this.cellSize + this.cellSize / 2;
            const centerY = this.previewPosition.y * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize * 0.4;

            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = this.currentPlayer === 'black' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawPiece(x, y, player) {
        const theme = this.themes[this.currentTheme];
        const centerX = x * this.cellSize + this.cellSize / 2;
        const centerY = y * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize * 0.4;

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = player === 'black' ? theme.black : theme.white;
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 添加落子动画
        const piece = document.createElement('div');
        piece.className = 'piece-animation';
        piece.style.position = 'absolute';
        piece.style.left = `${centerX}px`;
        piece.style.top = `${centerY}px`;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 300);
    }

    handleClick(e) {
        if (!this.gameStarted || this.winner) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = Math.floor(((e.clientX - rect.left) * scaleX) / this.cellSize);
        const y = Math.floor(((e.clientY - rect.top) * scaleY) / this.cellSize);

        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
            if (!this.board[y][x]) {
                this.makeMove(x, y);
            }
            this.previewPosition = { x, y };
            this.drawBoard();
            this.history.forEach(move => {
                this.drawPiece(move.x, move.y, move.player);
            });
        }
    }

    makeMove(x, y) {
        if (this.board[y][x]) return;

        // 更新预览位置
        this.previewPosition = { x, y };

        this.board[y][x] = this.currentPlayer;
        this.history.push({ x, y, player: this.currentPlayer });
        this.drawPiece(x, y, this.currentPlayer);

        if (this.checkWin(x, y)) {
            this.winner = this.currentPlayer;
            setTimeout(() => alert(`${this.currentPlayer === 'black' ? '黑子' : '白子'}获胜！`), 100);
            return;
        }

        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        document.getElementById('currentPlayer').textContent = `当前回合: ${this.currentPlayer === 'black' ? '黑子' : '白子'}`;

        if (this.gameMode === 'pve' && this.currentPlayer === 'white') {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }

    makeAIMove() {
        const move = this.calculateAIMove();
        if (move) {
            this.makeMove(move.x, move.y);
        }
    }

    calculateAIMove() {
        // AI移动逻辑
        const emptyCells = [];
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (!this.board[y][x]) {
                    const score = this.evaluatePosition(x, y);
                    emptyCells.push({ x, y, score });
                }
            }
        }

        if (emptyCells.length === 0) return null;

        // 根据难度调整AI的选择
        emptyCells.sort((a, b) => b.score - a.score);
        let moveIndex = 0;

        switch (this.difficulty) {
            case 'easy':
                moveIndex = Math.floor(Math.random() * Math.min(5, emptyCells.length));
                break;
            case 'medium':
                moveIndex = Math.floor(Math.random() * Math.min(3, emptyCells.length));
                break;
            case 'hard':
                moveIndex = 0; // 始终选择最佳位置
                break;
        }

        return emptyCells[moveIndex];
    }

    evaluatePosition(x, y) {
        // 评估位置分数
        let score = 0;
        const directions = [
            [1, 0], [0, 1], [1, 1], [1, -1] // 水平、垂直、对角线
        ];

        directions.forEach(([dx, dy]) => {
            score += this.evaluateDirection(x, y, dx, dy, 'white'); // AI得分
            score += this.evaluateDirection(x, y, dx, dy, 'black') * 1.1; // 防守得分略高
        });

        return score;
    }

    evaluateDirection(x, y, dx, dy, player) {
        let score = 0;
        let count = 0;
        let blocked = 0;

        // 正向检查
        for (let i = 1; i < 5; i++) {
            const newX = x + dx * i;
            const newY = y + dy * i;
            if (!this.isValidPosition(newX, newY)) {
                blocked++;
                break;
            }
            if (this.board[newY][newX] === player) {
                count++;
            } else if (this.board[newY][newX] !== null) {
                blocked++;
                break;
            } else {
                break;
            }
        }

        // 反向检查
        for (let i = 1; i < 5; i++) {
            const newX = x - dx * i;
            const newY = y - dy * i;
            if (!this.isValidPosition(newX, newY)) {
                blocked++;
                break;
            }
            if (this.board[newY][newX] === player) {
                count++;
            } else if (this.board[newY][newX] !== null) {
                blocked++;
                break;
            } else {
                break;
            }
        }

        // 计算分数
        if (count >= 4) return 10000; // 必胜
        if (count === 3 && blocked === 0) return 1000; // 活四
        if (count === 3 && blocked === 1) return 100; // 冲四
        if (count === 2 && blocked === 0) return 50; // 活三
        if (count === 2 && blocked === 1) return 10; // 眠三
        if (count === 1 && blocked === 0) return 5; // 活二

        return 1;
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize;
    }

    checkWin(x, y) {
        const directions = [
            [1, 0], [0, 1], [1, 1], [1, -1]
        ];

        return directions.some(([dx, dy]) => {
            let count = 1;
            
            // 正向检查
            for (let i = 1; i < 5; i++) {
                const newX = x + dx * i;
                const newY = y + dy * i;
                if (!this.isValidPosition(newX, newY) || 
                    this.board[newY][newX] !== this.currentPlayer) break;
                count++;
            }
            
            // 反向检查
            for (let i = 1; i < 5; i++) {
                const newX = x - dx * i;
                const newY = y - dy * i;
                if (!this.isValidPosition(newX, newY) || 
                    this.board[newY][newX] !== this.currentPlayer) break;
                count++;
            }

            return count >= 5;
        });
    }

    undo() {
        if (!this.gameStarted || this.history.length === 0 || this.undoCount <= 0) return;

        if (this.gameMode === 'pve') {
            // 在人机模式下，需要撤销两步（玩家和AI的移动）
            for (let i = 0; i < 2 && this.history.length > 0; i++) {
                const lastMove = this.history.pop();
                this.board[lastMove.y][lastMove.x] = null;
            }
            this.currentPlayer = 'black';
        } else {
            // 在双人模式下，只撤销一步
            const lastMove = this.history.pop();
            this.board[lastMove.y][lastMove.x] = null;
            this.currentPlayer = lastMove.player;
        }

        this.undoCount--;
        this.winner = null;
        document.getElementById('undoCount').textContent = `剩余悔棋次数: ${this.undoCount}`;
        document.getElementById('currentPlayer').textContent = `当前回合: ${this.currentPlayer === 'black' ? '黑子' : '白子'}`;

        // 重绘棋盘
        this.drawBoard();
        this.history.forEach(move => {
            this.drawPiece(move.x, move.y, move.player);
        });
    }

    restart() {
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(null));
        this.history = [];
        this.currentPlayer = 'black';
        this.undoCount = 3;
        this.winner = null;
        this.drawBoard();
        document.getElementById('currentPlayer').textContent = `当前回合: 黑子`;
        document.getElementById('undoCount').textContent = `剩余悔棋次数: ${this.undoCount}`;
    }

    backToMenu() {
        this.restart();
        this.gameStarted = false;
        this.gameMode = null;
        this.difficulty = null;
        document.querySelector('.game-area').style.display = 'none';
        document.getElementById('gameModeSelection').style.display = 'block';
        document.getElementById('difficultySelection').style.display = 'none';
    }

    showRules() {
        alert('游戏规则：\n1. 黑白双方轮流落子\n2. 在横、竖、斜方向连成5个或更多同色棋子即可获胜\n3. 每局游戏最多可悔棋3次\n4. 使用方向键移动预览位置，回车键确认落子');
    }

    handleKeyPress(e) {
        if (!this.gameStarted || this.winner) return;

        switch(e.key) {
            case 'ArrowUp':
                if (this.previewPosition.y > 0) {
                    this.previewPosition.y--;
                }
                break;
            case 'ArrowDown':
                if (this.previewPosition.y < this.boardSize - 1) {
                    this.previewPosition.y++;
                }
                break;
            case 'ArrowLeft':
                if (this.previewPosition.x > 0) {
                    this.previewPosition.x--;
                }
                break;
            case 'ArrowRight':
                if (this.previewPosition.x < this.boardSize - 1) {
                    this.previewPosition.x++;
                }
                break;
            case 'Enter':
                if (!this.board[this.previewPosition.y][this.previewPosition.x]) {
                    this.makeMove(this.previewPosition.x, this.previewPosition.y);
                    return;
                }
                break;
        }

        // 重绘棋盘和棋子
        this.drawBoard();
        this.history.forEach(move => {
            this.drawPiece(move.x, move.y, move.player);
        });
    }
}

// 创建游戏实例
const game = new GomokuGame();