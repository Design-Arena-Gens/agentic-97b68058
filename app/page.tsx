"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";

const GRID_SIZE = 5;
const BOARD_CELLS = GRID_SIZE * GRID_SIZE;

interface GameSnapshot {
  board: number[];
  moves: number;
}

const baseOffsets = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
] as const;

const toggleMatrix = buildToggleMatrix();

function coordToIndex(row: number, col: number) {
  return row * GRID_SIZE + col;
}

function indexToCoord(index: number) {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return { row, col };
}

function buildToggleMatrix() {
  const matrix: number[][] = Array.from({ length: BOARD_CELLS }, () => Array(BOARD_CELLS).fill(0));

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const idx = coordToIndex(row, col);
      for (const [dx, dy] of baseOffsets) {
        const nr = row + dx;
        const nc = col + dy;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          const neighborIndex = coordToIndex(nr, nc);
          matrix[neighborIndex][idx] = 1;
        }
      }
    }
  }

  return matrix;
}

function gaussianEliminationGF2(inputMatrix: number[][], inputVector: number[]): number[] | null {
  const rows = inputMatrix.length;
  const cols = inputMatrix[0].length;
  const matrix = inputMatrix.map((row) => [...row]);
  const vector = [...inputVector];

  const pivotColumns: number[] = Array(rows).fill(-1);
  let currentRow = 0;

  for (let col = 0; col < cols && currentRow < rows; col++) {
    let pivotRow = currentRow;
    while (pivotRow < rows && matrix[pivotRow][col] === 0) {
      pivotRow++;
    }

    if (pivotRow === rows) {
      continue;
    }

    if (pivotRow !== currentRow) {
      [matrix[currentRow], matrix[pivotRow]] = [matrix[pivotRow], matrix[currentRow]];
      [vector[currentRow], vector[pivotRow]] = [vector[pivotRow], vector[currentRow]];
    }

    pivotColumns[currentRow] = col;

    for (let row = 0; row < rows; row++) {
      if (row !== currentRow && matrix[row][col] === 1) {
        for (let k = col; k < cols; k++) {
          matrix[row][k] ^= matrix[currentRow][k];
        }
        vector[row] ^= vector[currentRow];
      }
    }

    currentRow++;
  }

  for (let row = currentRow; row < rows; row++) {
    const sum = matrix[row].every((value) => value === 0);
    if (sum && vector[row] === 1) {
      return null;
    }
  }

  const solution = Array(cols).fill(0);

  for (let row = currentRow - 1; row >= 0; row--) {
    const pivotCol = pivotColumns[row];
    if (pivotCol === -1) {
      continue;
    }

    let accum = vector[row];
    for (let col = pivotCol + 1; col < cols; col++) {
      if (matrix[row][col] === 1) {
        accum ^= solution[col];
      }
    }

    solution[pivotCol] = accum & 1;
  }

  return solution;
}

function computeSolution(board: number[]): number[] | null {
  const solutionVector = gaussianEliminationGF2(toggleMatrix, board);
  if (!solutionVector) {
    return null;
  }

  return solutionVector
    .map((value, index) => ({ value: value & 1, index }))
    .filter((entry) => entry.value === 1)
    .map((entry) => entry.index)
    .sort((a, b) => {
      const ca = indexToCoord(a);
      const cb = indexToCoord(b);
      const center = (GRID_SIZE - 1) / 2;
      const da = Math.abs(ca.row - center) + Math.abs(ca.col - center);
      const db = Math.abs(cb.row - center) + Math.abs(cb.col - center);
      return da - db || ca.row - cb.row || ca.col - cb.col;
    });
}

function isSolved(board: number[]) {
  return board.every((value) => value === 0);
}

function toggleCell(board: number[], index: number) {
  const next = [...board];
  const { row, col } = indexToCoord(index);
  for (const [dx, dy] of baseOffsets) {
    const nr = row + dx;
    const nc = col + dy;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
      const neighborIndex = coordToIndex(nr, nc);
      next[neighborIndex] = next[neighborIndex] ^ 1;
    }
  }
  return next;
}

function createPuzzle(randomSeed: number) {
  let board = Array(BOARD_CELLS).fill(0);
  let toggles = 0;

  for (let iteration = 0; iteration < BOARD_CELLS; iteration++) {
    const threshold = (Math.sin(randomSeed + iteration * 12.9898) * 43758.5453) % 1;
    if (Math.abs(threshold) > 0.35) {
      const index = iteration % BOARD_CELLS;
      board = toggleCell(board, index);
      toggles++;
    }
  }

  if (toggles === 0 || isSolved(board)) {
    board = toggleCell(board, Math.floor(Math.abs(Math.sin(randomSeed) * BOARD_CELLS) % BOARD_CELLS));
  }

  return board;
}

function useGameState() {
  const [seed, setSeed] = useState(() => Math.random() * 1000);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => ({
    board: createPuzzle(seed),
    moves: 0
  }));

  useEffect(() => {
    setSnapshot({ board: createPuzzle(seed), moves: 0 });
  }, [seed]);

  const shuffle = useCallback(() => {
    setSeed(Math.random() * 1000 + Date.now());
  }, []);

  const makeMove = useCallback((index: number) => {
    setSnapshot((current) => ({
      board: toggleCell(current.board, index),
      moves: current.moves + 1
    }));
  }, []);

  return {
    board: snapshot.board,
    moves: snapshot.moves,
    reset: shuffle,
    play: makeMove
  };
}

function NeuralGrid() {
  const { board, moves, play, reset } = useGameState();
  const solved = useMemo(() => isSolved(board), [board]);
  const aiPlan = useMemo(() => computeSolution(board), [board]);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  useEffect(() => {
    setHintIndex(null);
    setShowPlan(false);
  }, [board]);

  const requestHint = useCallback(() => {
    if (!aiPlan || aiPlan.length === 0) {
      setHintIndex(null);
      return;
    }
    setHintIndex(aiPlan[0]);
    setShowPlan(true);
  }, [aiPlan]);

  const handleCellClick = useCallback(
    (index: number) => {
      play(index);
      if (hintIndex === index) {
        setHintIndex(null);
      }
    },
    [play, hintIndex]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-night via-slate-900 to-night text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-3 text-center">
          <p className="font-display text-sm uppercase tracking-[0.35rem] text-slate-300">NeuroGrid Protocol</p>
          <h1 className="font-display text-4xl font-semibold text-neon-cyan md:text-5xl">Synchronize The Quantum Lattice</h1>
          <p className="mx-auto max-w-3xl text-base text-slate-300 md:text-lg">
            A rogue neural core is distorting the energy lattice. Stabilize the grid by collapsing every node to zero. Each move flips a node and its orthogonal neighbors. Consult the embedded strategist for optimal play, or outthink the machine yourself.
          </p>
        </header>

        <main className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
          <section className="flex flex-col items-center gap-8">
            <div className="grid grid-cols-3 items-center gap-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left">
                <p className="text-xs uppercase tracking-wide text-slate-400">Moves</p>
                <p className="font-display text-3xl text-neon-lime">{moves}</p>
              </div>
              <button
                type="button"
                onClick={requestHint}
                className="group rounded-2xl border border-neon-cyan/40 bg-gradient-to-r from-neon-cyan/20 via-transparent to-neon-magenta/20 px-6 py-4 text-left shadow-[0_0_25px_rgba(95,220,255,0.25)] transition hover:border-neon-cyan hover:from-neon-cyan/30 hover:to-neon-magenta/30"
              >
                <p className="text-xs uppercase tracking-wide text-neon-cyan">AI Strategist</p>
                <p className="font-display text-lg text-white">
                  {aiPlan && aiPlan.length > 0 ? `Move ${aiPlan.length}` : "Vector Solved"}
                </p>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-300">
                  <span className="h-1 w-6 bg-gradient-to-r from-neon-cyan to-neon-lime" />
                  Request optimal target
                </span>
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-display text-lg tracking-wide text-slate-200 transition hover:border-neon-magenta hover:text-neon-magenta"
              >
                Regenerate Grid
              </button>
            </div>

            <div className="relative">
              <div className="grid grid-cols-5 gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_80px_rgba(5,11,26,0.6)] backdrop-blur">
                {board.map((value, index) => {
                  const { row, col } = indexToCoord(index);
                  const active = value === 1;
                  const isHint = hintIndex === index;
                  const highlight = showPlan && aiPlan?.includes(index);

                  return (
                    <button
                      key={`${row}-${col}`}
                      type="button"
                      onClick={() => handleCellClick(index)}
                      className={classNames(
                        "aspect-square rounded-2xl border transition-all duration-200",
                        active
                          ? "border-neon-cyan/60 bg-gradient-to-br from-neon-cyan/40 via-transparent to-neon-magenta/50 shadow-[0_0_25px_rgba(168,255,96,0.35)]"
                          : "border-white/10 bg-white/5 hover:border-neon-cyan/40 hover:bg-white/10",
                        isHint && "animate-pulse border-neon-lime bg-neon-lime/40",
                        highlight && !isHint && "border-neon-cyan/50"
                      )}
                    >
                      <span className="flex h-full w-full items-center justify-center font-display text-2xl text-white/90">
                        {active ? "1" : "0"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {solved && <WinOverlay moves={moves} />}            
            </div>
          </section>

          <aside className="flex flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_80px_rgba(5,11,26,0.5)]">
            <StrategistPanel aiPlan={aiPlan} onRevealPlan={() => setShowPlan((prev) => !prev)} showPlan={showPlan} />
            <LorePanel />
          </aside>
        </main>
      </div>
    </div>
  );
}

function WinOverlay({ moves }: { moves: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-neon-lime/20 via-transparent to-neon-cyan/30" />
      <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 400 400">
        {Array.from({ length: 28 }).map((_, index) => {
          const x = (index * 53) % 400;
          const y = (index * 97) % 400;
          return <circle key={index} cx={x} cy={y} r="1.5" fill="#a8ff60" />;
        })}
      </svg>
      <div className="relative flex flex-col items-center gap-2 text-center">
        <p className="font-display text-sm uppercase tracking-[0.4rem] text-neon-cyan">Grid Synchronized</p>
        <h2 className="font-display text-4xl text-white drop-shadow">Neural Harmony Achieved</h2>
        <p className="text-slate-200">Stabilized in {moves} moves. Launch a new grid to keep training.</p>
      </div>
    </div>
  );
}

function StrategistPanel({
  aiPlan,
  onRevealPlan,
  showPlan
}: {
  aiPlan: number[] | null;
  onRevealPlan: () => void;
  showPlan: boolean;
}) {
  const renderPlan = () => {
    if (!aiPlan) {
      return <p className="text-sm text-red-300">Strategist failed to converge on a solution.</p>;
    }

    if (aiPlan.length === 0) {
      return <p className="text-sm text-neon-lime">Grid already aligned. Execute no further action.</p>;
    }

    return (
      <ul className="mt-3 space-y-2">
        {aiPlan.map((index, order) => {
          const { row, col } = indexToCoord(index);
          return (
            <li
              key={index}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-night/40 px-3 py-2 text-sm text-slate-200"
            >
              <span className="font-display text-xs uppercase tracking-wide text-slate-400">Step {order + 1}</span>
              <span>
                Toggle node <span className="text-neon-cyan">[{row + 1}, {col + 1}]</span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <h2 className="font-display text-xl text-white">Embedded Strategist</h2>
        <button
          type="button"
          className="text-xs uppercase tracking-wide text-neon-cyan transition hover:text-neon-lime"
          onClick={onRevealPlan}
        >
          {showPlan ? "Hide Plan" : "Show Plan"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        Quantum heuristics inspect the lattice and prescribe a perfect series of toggles. Study the sequence to
        anticipate emergent patterns.
      </p>
      {showPlan && renderPlan()}
    </div>
  );
}

function LorePanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-night/40 p-6 text-sm text-slate-300">
      <h3 className="font-display text-lg text-white">Mission Parameters</h3>
      <p className="mt-2">
        NeuroGrid is a strategic puzzle forged by an adaptive solver. Every lattice is generated via deterministic chaos, guaranteeing solvable configurations with unique signatures. The embedded strategist performs Gaussian elimination in GF(2) to engineer flawless recovery paths.
      </p>
      <p className="mt-3">
        Become faster than the machine. Track your move efficiency, iterate through increasingly complex grids, and crack the meta-patterns behind the neural weave.
      </p>
    </div>
  );
}

export default function Page() {
  return <NeuralGrid />;
}
