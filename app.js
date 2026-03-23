const COLORS = [
  { key: 'red', label: 'Red', points: 1, color: '#b91c1c' },
  { key: 'yellow', label: 'Yellow', points: 2, color: '#eab308' },
  { key: 'green', label: 'Green', points: 3, color: '#16a34a' },
  { key: 'brown', label: 'Brown', points: 4, color: '#92400e' },
  { key: 'blue', label: 'Blue', points: 5, color: '#2563eb' },
  { key: 'pink', label: 'Pink', points: 6, color: '#ec4899' },
  { key: 'black', label: 'Black', points: 7, color: '#111827' },
];
const ENDGAME_ORDER = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];

const initialState = () => ({
  players: [
    { name: 'Player 1', score: 0, currentBreak: 0, bestBreak: 0 },
    { name: 'Player 2', score: 0, currentBreak: 0, bestBreak: 0 },
  ],
  activePlayer: 0,
  redsLeft: 15,
  expecting: 'red',
  colorsCleared: [],
  missMarked: false,
  log: 'Ready to start the frame.',
  history: [],
});

let state = initialState();

const els = {
  scoreGrid: document.getElementById('score-grid'),
  nameEditor: document.getElementById('name-editor'),
  playerSwitch: document.getElementById('player-switch'),
  ballButtons: document.getElementById('ball-buttons'),
  foulButtons: document.getElementById('foul-buttons'),
  redsLeft: document.getElementById('reds-left'),
  phase: document.getElementById('phase'),
  nextBall: document.getElementById('next-ball'),
  remaining: document.getElementById('remaining-points'),
  log: document.getElementById('event-log'),
};

function cloneState() {
  return JSON.parse(JSON.stringify(state));
}

function pushHistory() {
  state.history.push(cloneState());
}

function switchPlayer(resetBreak = true) {
  if (resetBreak) {
    state.players[state.activePlayer].currentBreak = 0;
  }
  state.activePlayer = state.activePlayer === 0 ? 1 : 0;
}

function addPoints(playerIndex, points) {
  const player = state.players[playerIndex];
  player.score += points;
  player.currentBreak += points;
  player.bestBreak = Math.max(player.bestBreak, player.currentBreak);
}

function remainingPoints() {
  const redsPhase = state.redsLeft * 8;
  const colorsLeft = ENDGAME_ORDER
    .filter((key) => !state.colorsCleared.includes(key))
    .reduce((sum, key) => sum + COLORS.find((ball) => ball.key === key).points, 0);
  return state.redsLeft > 0 ? redsPhase + 27 : colorsLeft;
}

function phaseText() {
  return state.redsLeft > 0 ? 'Reds + colors' : 'Colors clearance';
}

function nextExpectedText() {
  if (state.redsLeft > 0) return state.expecting === 'red' ? 'Red' : 'Any color';
  return ENDGAME_ORDER.find((key) => !state.colorsCleared.includes(key)) || 'Frame complete';
}

function sanitizeName(value, fallback) {
  return value.trim() || fallback;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;');
}

function updatePlayerName(index, value) {
  state.players[index].name = sanitizeName(value, `Player ${index + 1}`);
}

function render() {
  els.scoreGrid.innerHTML = state.players
    .map(
      (player, index) => `
        <article class="player-card ${index === state.activePlayer ? 'active' : ''}">
          <p class="label">${escapeHtml(player.name)}</p>
          <div class="score">${player.score}</div>
          <p class="break">Current break: ${player.currentBreak}</p>
          <p class="muted">Best break: ${player.bestBreak}</p>
        </article>`,
    )
    .join('');

  els.nameEditor.innerHTML = state.players
    .map(
      (player, index) => `
        <label>
          <span>Player name</span>
          <input data-name-input="${index}" value="${escapeHtml(player.name)}" maxlength="24" />
        </label>`,
    )
    .join('');

  els.playerSwitch.innerHTML = state.players
    .map(
      (player, index) => `<button class="${index === state.activePlayer ? 'active' : ''}" data-player="${index}">${escapeHtml(player.name)} to play</button>`,
    )
    .join('');

  els.ballButtons.innerHTML = COLORS.map((ball) => {
    const disabled = !isBallAllowed(ball.key);
    return `<button data-ball="${ball.key}" style="background:${ball.color}; color:${ball.key === 'black' ? '#fff' : '#fff'}" ${disabled ? 'disabled' : ''}>${ball.label} (+${ball.points})</button>`;
  }).join('');

  els.foulButtons.innerHTML = [4, 5, 6, 7]
    .map((points) => `<button data-foul="${points}" class="ghost">Foul +${points}</button>`)
    .join('');

  els.redsLeft.textContent = state.redsLeft;
  els.phase.textContent = phaseText();
  els.nextBall.textContent = nextExpectedText();
  els.remaining.textContent = remainingPoints();
  els.log.textContent = `${state.log}${state.missMarked ? ' Miss marker on.' : ''}`;
}

function isBallAllowed(key) {
  if (state.redsLeft > 0) {
    if (state.expecting === 'red') return key === 'red' && state.redsLeft > 0;
    return key !== 'red';
  }
  return key === ENDGAME_ORDER.find((ball) => !state.colorsCleared.includes(ball));
}

function potBall(key) {
  if (!isBallAllowed(key)) return;
  pushHistory();
  const ball = COLORS.find((item) => item.key === key);
  addPoints(state.activePlayer, ball.points);

  if (key === 'red') {
    state.redsLeft -= 1;
    state.expecting = 'color';
    state.log = `${state.players[state.activePlayer].name} potted a red.`;
  } else if (state.redsLeft > 0) {
    state.expecting = 'red';
    state.log = `${state.players[state.activePlayer].name} potted ${ball.label}.`; 
  } else {
    state.colorsCleared.push(key);
    state.log = `${state.players[state.activePlayer].name} cleared ${ball.label}.`;
  }

  state.missMarked = false;
  render();
}

function awardFoul(points) {
  pushHistory();
  const opponent = state.activePlayer === 0 ? 1 : 0;
  state.players[state.activePlayer].currentBreak = 0;
  state.players[opponent].score += points;
  state.log = `${state.players[opponent].name} received ${points} foul points.`;
  switchPlayer(false);
  state.missMarked = false;
  render();
}

function endBreak() {
  pushHistory();
  const previous = state.players[state.activePlayer].name;
  switchPlayer(true);
  state.log = `${previous}'s break ended. ${state.players[state.activePlayer].name} to play.`;
  state.missMarked = false;
  render();
}

function undo() {
  const previous = state.history.pop();
  if (!previous) return;
  state = previous;
  render();
}

document.addEventListener('click', (event) => {
  const player = event.target.dataset.player;
  const ball = event.target.dataset.ball;
  const foul = event.target.dataset.foul;

  if (player !== undefined) {
    state.activePlayer = Number(player);
    render();
  }
  if (ball) potBall(ball);
  if (foul) awardFoul(Number(foul));
});

document.getElementById('end-break').addEventListener('click', endBreak);
document.getElementById('undo').addEventListener('click', undo);
document.getElementById('reset-frame').addEventListener('click', () => {
  state = initialState();
  render();
});
document.getElementById('miss-toggle').addEventListener('click', () => {
  state.missMarked = !state.missMarked;
  render();
});

render();


document.addEventListener('change', (event) => {
  const index = event.target.dataset.nameInput;
  if (index === undefined) return;
  updatePlayerName(Number(index), event.target.value);
  render();
});

document.addEventListener('keydown', (event) => {
  const index = event.target.dataset.nameInput;
  if (index === undefined || event.key !== 'Enter') return;
  updatePlayerName(Number(index), event.target.value);
  event.target.blur();
});
