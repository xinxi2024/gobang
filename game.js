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
        this.previewPosition = { x: 7, y: 7 };

        // AI增强参数
        this.searchDepth = {
            easy: 1,
            medium: 3,
            hard: 5
        };
        this.isThinking = false;

        this.initializeEventListeners();
        this.initializeThemes();
    }

    initializeEventListeners() {
        document.getElementById('pvpMode').addEventListener('click', () => this.selectGameMode('pvp'));
        document.getElementById('pveMode').addEventListener('click', () => this.selectGameMode('pve'));

        document.querySelectorAll('.difficulty-selection button').forEach(button => {
            button.addEventListener('click', () => this.selectDifficulty(button.dataset.difficulty));
        });

        document.getElementById('themeSelect').addEventListener('change', (e) => this.changeTheme(e.target.value));
        document.getElementById('undoButton').addEventListener('click', () => this.undo());
        document.getElementById('restartButton').addEventListener('click', () => this.restart());
        document.getElementById('backToMenu').addEventListener('click', () => this.backToMenu());
        document.getElementById('showRules').addEventListener('click', () => this.showRules());

        this.canvas.addEventListener('click', (e) => this.handleClick(e));
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
        
        this.ctx.fillStyle = theme.board;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = theme.lines;
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.boardSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.cellSize / 2, i * this.cellSize + this.cellSize / 2);
            this.ctx.lineTo(this.canvas.width - this.cellSize / 2, i * this.cellSize + this.cellSize / 2);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize + this.cellSize / 2, this.cellSize / 2);
            this.ctx.lineTo(i * this.cellSize + this.cellSize / 2, this.canvas.height - this.cellSize / 2);
            this.ctx.stroke();
        }

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

        const piece = document.createElement('div');
        piece.className = 'piece-animation';
        piece.style.position = 'absolute';
        piece.style.left = `${centerX}px`;
        piece.style.top = `${centerY}px`;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 300);
    }

    handleClick(e) {
        if (!this.gameStarted || this.winner || this.isThinking) return;

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
            this.isThinking = true;
            document.getElementById('currentPlayer').textContent = 'AI思考中...';
            setTimeout(() => this.makeAIMove(), 300);
        }
    }

    makeAIMove() {
        const move = this.calculateAIMove();
        if (move) {
            this.isThinking = false;
            this.makeMove(move.x, move.y);
        }
    }

    calculateAIMove() {
        switch (this.difficulty) {
            case 'easy':
                return this.getEasyMove();
            case 'medium':
                return this.getMediumMove();
            case 'hard':
                return this.getHardMove();
            default:
                return this.getEasyMove();
        }
    }

    // 简单难度：随机选择 + 基础防守
    getEasyMove() {
        // 检查是否有立即获胜的机会
        const winMove = this.findWinningMove('white');
        if (winMove && Math.random() < 0.7) return winMove;

        // 检查是否需要防守
        const blockMove = this.findWinningMove('black');
        if (blockMove && Math.random() < 0.5) return blockMove;

        // 随机选择一个不错的位置
        const candidates = this.getCandidateMoves();
        if (candidates.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * Math.min(8, candidates.length));
        return candidates[randomIndex];
    }

    // 中等难度：规则基础 + 有限前瞻
    getMediumMove() {
        // 必胜检查
        const winMove = this.findWinningMove('white');
        if (winMove) return winMove;

        // 必防检查
        const blockMove = this.findWinningMove('black');
        if (blockMove) return blockMove;

        // 检查双重威胁
        const doubleAttack = this.findDoubleAttackMove('white');
        if (doubleAttack) return doubleAttack;

        // 阻止对手双重威胁
        const blockDoubleAttack = this.findDoubleAttackMove('black');
        if (blockDoubleAttack) return blockDoubleAttack;

        // 使用评估函数选择最佳位置
        return this.getBestMoveByEvaluation();
    }

    // 困难难度：极小化极大算法 + α-β剪枝
    getHardMove() {
        const depth = this.searchDepth.hard;
        const result = this.alphabeta(depth, -Infinity, Infinity, true);
        return result.move;
    }

    // α-β剪枝的极小化极大算法
    alphabeta(depth, alpha, beta, maximizingPlayer) {
        if (depth === 0) {
            return { score: this.evaluateBoard(), move: null };
        }

        const moves = this.getCandidateMoves(10); // 限制搜索宽度
        if (moves.length === 0) {
            return { score: this.evaluateBoard(), move: null };
        }

        let bestMove = moves[0];

        if (maximizingPlayer) {
            let maxScore = -Infinity;
            for (const move of moves) {
                this.board[move.y][move.x] = 'white';
                
                // 检查是否获胜
                if (this.checkWinAt(move.x, move.y, 'white')) {
                    this.board[move.y][move.x] = null;
                    return { score: 100000, move: move };
                }

                const result = this.alphabeta(depth - 1, alpha, beta, false);
                this.board[move.y][move.x] = null;

                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, result.score);
                if (beta <= alpha) break; // α-β剪枝
            }
            return { score: maxScore, move: bestMove };
        } else {
            let minScore = Infinity;
            for (const move of moves) {
                this.board[move.y][move.x] = 'black';
                
                // 检查是否对手获胜
                if (this.checkWinAt(move.x, move.y, 'black')) {
                    this.board[move.y][move.x] = null;
                    return { score: -100000, move: move };
                }

                const result = this.alphabeta(depth - 1, alpha, beta, true);
                this.board[move.y][move.x] = null;

                if (result.score < minScore) {
                    minScore = result.score;
                    bestMove = move;
                }
                beta = Math.min(beta, result.score);
                if (beta <= alpha) break; // α-β剪枝
            }
            return { score: minScore, move: bestMove };
        }
    }

    // 寻找获胜位置
    findWinningMove(player) {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (!this.board[y][x]) {
                    this.board[y][x] = player;
                    if (this.checkWinAt(x, y, player)) {
                        this.board[y][x] = null;
                        return { x, y };
                    }
                    this.board[y][x] = null;
                }
            }
        }
        return null;
    }

    // 寻找双重威胁位置
    findDoubleAttackMove(player) {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (!this.board[y][x]) {
                    this.board[y][x] = player;
                    let threats = 0;
                    
                    // 检查这一步棋后能创造多少威胁
                    for (let dy = 0; dy < this.boardSize; dy++) {
                        for (let dx = 0; dx < this.boardSize; dx++) {
                            if (!this.board[dy][dx] && !(dx === x && dy === y)) {
                                this.board[dy][dx] = player;
                                if (this.checkWinAt(dx, dy, player)) {
                                    threats++;
                                }
                                this.board[dy][dx] = null;
                            }
                        }
                    }
                    
                    this.board[y][x] = null;
                    if (threats >= 2) {
                        return { x, y };
                    }
                }
            }
        }
        return null;
    }

    // 获取候选移动位置
    getCandidateMoves(limit = 20) {
        const moves = [];
        const visited = new Set();

        // 在已有棋子周围寻找候选位置
        for (const move of this.history) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const x = move.x + dx;
                    const y = move.y + dy;
                    const key = `${x},${y}`;
                    
                    if (this.isValidPosition(x, y) && !this.board[y][x] && !visited.has(key)) {
                        visited.add(key);
                        const score = this.evaluatePosition(x, y);
                        moves.push({ x, y, score });
                    }
                }
            }
        }

        // 如果没有历史记录，从中心开始
        if (moves.length === 0) {
            const center = Math.floor(this.boardSize / 2);
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const x = center + dx;
                    const y = center + dy;
                    if (this.isValidPosition(x, y) && !this.board[y][x]) {
                        moves.push({ x, y, score: this.evaluatePosition(x, y) });
                    }
                }
            }
        }

        // 按分数排序并限制数量
        moves.sort((a, b) => b.score - a.score);
        return moves.slice(0, limit);
    }

    // 评估整个棋盘
    evaluateBoard() {
        let score = 0;
        
        // 评估所有位置
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === 'white') {
                    score += this.evaluatePosition(x, y, 'white');
                } else if (this.board[y][x] === 'black') {
                    score -= this.evaluatePosition(x, y, 'black');
                }
            }
        }
        
        return score;
    }

    // 使用评估函数获取最佳移动
    getBestMoveByEvaluation() {
        const candidates = this.getCandidateMoves();
        if (candidates.length === 0) return null;
        
        return candidates[0]; // 已经按分数排序
    }

    // 增强的位置评估函数
    evaluatePosition(x, y, forPlayer = null) {
        let score = 0;
        const directions = [
            [1, 0], [0, 1], [1, 1], [1, -1]
        ];

        directions.forEach(([dx, dy]) => {
            if (forPlayer) {
                score += this.evaluateDirection(x, y, dx, dy, forPlayer);
            } else {
                score += this.evaluateDirection(x, y, dx, dy, 'white') * 1.0;
                score += this.evaluateDirection(x, y, dx, dy, 'black') * 1.1; // 防守权重略高
            }
        });

        // 位置权重：中心位置更有价值
        const centerX = Math.floor(this.boardSize / 2);
        const centerY = Math.floor(this.boardSize / 2);
        const distanceFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
        score += Math.max(0, 10 - distanceFromCenter);

        return score;
    }

    // 增强的方向评估
    evaluateDirection(x, y, dx, dy, player) {
        let score = 0;
        let count = 0;
        let blocked = 0;
        let spaces = 0;

        // 正向检查
        for (let i = 1; i < 6; i++) {
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
                spaces++;
                if (spaces > 1) break; // 最多允许一个空格
            }
        }

        // 反向检查
        spaces = 0;
        for (let i = 1; i < 6; i++) {
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
                spaces++;
                if (spaces > 1) break;
            }
        }

        // 更精细的评分系统
        if (count >= 4) return 50000; // 成五
        if (count === 3) {
            if (blocked === 0) return 5000; // 活四
            if (blocked === 1) return 1000; // 冲四
        }
        if (count === 2) {
            if (blocked === 0) return 500; // 活三
            if (blocked === 1) return 100; // 眠三
        }
        if (count === 1) {
            if (blocked === 0) return 50; // 活二
            if (blocked === 1) return 10; // 眠二
        }

        return Math.max(1, count);
    }

    // 检查指定位置是否获胜
    checkWinAt(x, y, player) {
        const directions = [
            [1, 0], [0, 1], [1, 1], [1, -1]
        ];

        return directions.some(([dx, dy]) => {
            let count = 1;
            
            for (let i = 1; i < 5; i++) {
                const newX = x + dx * i;
                const newY = y + dy * i;
                if (!this.isValidPosition(newX, newY) || 
                    this.board[newY][newX] !== player) break;
                count++;
            }
            
            for (let i = 1; i < 5; i++) {
                const newX = x - dx * i;
                const newY = y - dy * i;
                if (!this.isValidPosition(newX, newY) || 
                    this.board[newY][newX] !== player) break;
                count++;
            }

            return count >= 5;
        });
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize;
    }

    checkWin(x, y) {
        return this.checkWinAt(x, y, this.currentPlayer);
    }

    undo() {
        if (!this.gameStarted || this.history.length === 0 || this.undoCount <= 0 || this.isThinking) return;

        if (this.gameMode === 'pve') {
            for (let i = 0; i < 2 && this.history.length > 0; i++) {
                const lastMove = this.history.pop();
                this.board[lastMove.y][lastMove.x] = null;
            }
            this.currentPlayer = 'black';
        } else {
            const lastMove = this.history.pop();
            this.board[lastMove.y][lastMove.x] = null;
            this.currentPlayer = lastMove.player;
        }

        this.undoCount--;
        this.winner = null;
        document.getElementById('undoCount').textContent = `剩余悔棋次数: ${this.undoCount}`;
        document.getElementById('currentPlayer').textContent = `当前回合: ${this.currentPlayer === 'black' ? '黑子' : '白子'}`;

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
        this.isThinking = false;
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
        alert('游戏规则：\n1. 黑白双方轮流落子\n2. 在横、竖、斜方向连成5个或更多同色棋子即可获胜\n3. 每局游戏最多可悔棋3次\n4. 使用方向键移动预览位置，回车键确认落子\n\nAI难度说明：\n普通：基础规则 + 随机性\n困难：威胁检测 + 双重攻击\n地狱：深度搜索 + 最优策略');
    }

    handleKeyPress(e) {
        if (!this.gameStarted || this.winner || this.isThinking) return;

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

        this.drawBoard();
        this.history.forEach(move => {
            this.drawPiece(move.x, move.y, move.player);
        });
    }
}

// 创建游戏实例
const game = new GomokuGame();