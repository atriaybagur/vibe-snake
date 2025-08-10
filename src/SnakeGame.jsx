import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GRID = 20;
const TILE = 20;
const CANVAS = GRID * TILE;

const DIRS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const FRUITS = ["🍎","🍒","🍌","🍇","🍊","🍉","🍓","🥝"];

function randCell(exclude = new Set()) {
  while (true) {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);
    const key = `${x},${y}`;
    if (!exclude.has(key)) return { x, y };
  }
}

function randFruit() {
  return FRUITS[Math.floor(Math.random() * FRUITS.length)];
}

function useInterval(callback, delay) {
  const savedCallback = useRef(() => {});
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default function SnakeGame() {
  const canvasRef = useRef(null);
  const [snake, setSnake] = useState(() => [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [pendingDir, setPendingDir] = useState({ x: 1, y: 0 });
  const [food, setFood] = useState(() => randCell(new Set(["10,10", "9,10", "8,10"])));
  const [fruitEmoji, setFruitEmoji] = useState(randFruit());
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(() => {
    const v = localStorage.getItem("snake-highscore");
    return v ? Number(v) : 0;
  });
  const [speed, setSpeed] = useState(120);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);

  const touchStart = useRef(null);
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < 24) return;
    if (ax > ay) {
      if (dx > 0) changeDir("ArrowRight");
      else changeDir("ArrowLeft");
    } else {
      if (dy > 0) changeDir("ArrowDown");
      else changeDir("ArrowUp");
    }
  };

  const changeDir = useCallback((key) => {
    const d = DIRS[key];
    if (!d) return;
    if (d.x === -dir.x && d.y === -dir.y) return;
    setPendingDir(d);
  }, [dir]);

  useEffect(() => {
    const onKey = (e) => {
      if (DIRS[e.key]) {
        e.preventDefault();
        changeDir(e.key);
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        togglePause();
      }
      if (e.key.toLowerCase() === "r") restart();
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [changeDir]);

  const restart = useCallback(() => {
    setSnake([
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]);
    setDir({ x: 1, y: 0 });
    setPendingDir({ x: 1, y: 0 });
    setFood(randCell(new Set(["10,10", "9,10", "8,10"])));
    setFruitEmoji(randFruit());
    setScore(0);
    setOver(false);
    setPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  useInterval(() => {
    if (paused || over) return;

    setDir(pendingDir);
    setSnake((prev) => {
      const head = prev[0];
      let next = { x: head.x + pendingDir.x, y: head.y + pendingDir.y };
      if (next.x < 0) next.x = GRID - 1;
      if (next.x >= GRID) next.x = 0;
      if (next.y < 0) next.y = GRID - 1;
      if (next.y >= GRID) next.y = 0;

      for (let i = 0; i < prev.length; i++) {
        if (prev[i].x === next.x && prev[i].y === next.y) {
          setOver(true);
          return prev;
        }
      }

      const newSnake = [next, ...prev];
      if (next.x === food.x && next.y === food.y) {
        setScore((s) => s + 10);
        const exclude = new Set(newSnake.map((c) => `${c.x},${c.y}`));
        setFood(randCell(exclude));
        setFruitEmoji(randFruit());
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, speed);

  useEffect(() => {
    if (score > high) {
      setHigh(score);
      localStorage.setItem("snake-highscore", String(score));
    }
  }, [score, high]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, CANVAS, CANVAS);

    ctx.strokeStyle = "#18213d";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE + 0.5, 0);
      ctx.lineTo(i * TILE + 0.5, CANVAS);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * TILE + 0.5);
      ctx.lineTo(CANVAS, i * TILE + 0.5);
      ctx.stroke();
    }

    ctx.font = `${TILE - 4}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fruitEmoji, food.x * TILE + TILE / 2, food.y * TILE + TILE / 2);

    ctx.fillStyle = "#22c55e";
    snake.forEach((cell, i) => {
      const r = i === 0 ? 6 : 4;
      ctx.beginPath();
      ctx.roundRect(cell.x * TILE + 2, cell.y * TILE + 2, TILE - 4, TILE - 4, r);
      ctx.fill();
      if (i === 0) {
        // draw tongue
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 2;
        const cx = cell.x * TILE + TILE / 2;
        const cy = cell.y * TILE + TILE / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dir.x * TILE / 2, cy + dir.y * TILE / 2);
        ctx.stroke();
      }
    });
  }, [snake, food, fruitEmoji, dir]);

  const speedLabel = speed <= 80 ? "Fast" : speed >= 160 ? "Chill" : "Normal";

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl grid md:grid-cols-[420px,1fr] gap-6 items-start">
        <div className="bg-slate-800 rounded-2xl shadow-xl p-4 flex flex-col items-center gap-4 relative">
          <div className="w-[400px] h-[400px] rounded-2xl overflow-hidden ring-1 ring-slate-700 relative">
            <canvas
              ref={canvasRef}
              width={CANVAS}
              height={CANVAS}
              className="w-full h-full touch-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            />
            <AnimatePresence>
              {over && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-4"
                >
                  <div className="text-2xl font-bold mb-2">Game Over</div>
                  <div className="mb-4">You scored {score}. {score >= high ? "New high score!" : ""}</div>
                  <Button onClick={restart} variant="secondary" className="rounded-2xl">Play again</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button onClick={togglePause} variant="secondary" className="rounded-2xl">
              {paused ? (
                <span className="inline-flex items-center gap-2"><Play className="w-4 h-4" /> Resume</span>
              ) : (
                <span className="inline-flex items-center gap-2"><Pause className="w-4 h-4" /> Pause</span>
              )}
            </Button>
            <Button onClick={restart} className="rounded-2xl">
              <RotateCcw className="w-4 h-4 mr-2" /> Restart
            </Button>
            <div className="flex items-center gap-2 bg-slate-700/60 px-3 py-2 rounded-xl">
              <label className="text-sm opacity-80">Speed</label>
              <input
                type="range"
                min={60}
                max={220}
                step={10}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="accent-emerald-400"
              />
              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-900/60">{speedLabel}</span>
            </div>
          </div>

          <p className="text-xs opacity-70">Controls: Arrow Keys • Space/Enter to Pause • R to Restart • Swipe on mobile</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-slate-800 rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-70">Score</div>
                <motion.div key={score} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-3xl font-semibold">
                  {score}
                </motion.div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-70">Best</div>
                <div className="text-3xl font-semibold">{high}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl shadow-xl p-5 space-y-3">
            <h2 className="text-lg font-semibold">How to play</h2>
            <ul className="list-disc list-inside opacity-80 space-y-1 text-sm">
              <li>Use arrow keys (or swipe) to steer the snake.</li>
              <li>Eat the fruit to grow and earn points.</li>
              <li>Don’t run into yourself.</li>
              <li>Adjust speed for more challenge.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
