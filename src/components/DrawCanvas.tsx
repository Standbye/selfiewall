"use client";

import { useEffect, useRef, useState } from "react";

const COLORS = ["#1f2937", "#e11d48", "#2563eb", "#16a34a", "#f59e0b", "#9333ea", "#ffffff"];
const SIZES = [4, 8, 16];

/** Fingermal-Fläche — liefert das fertige Bild als JPEG-Blob. */
export function DrawCanvas({
  onDone,
  onCancel,
  primaryColor,
}: {
  onDone: (blob: Blob) => void;
  onCancel: () => void;
  primaryColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [isEmpty, setIsEmpty] = useState(true);
  const drawing = useRef(false);
  const history = useRef<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Interne Auflösung fix, Anzeige responsiv — 3:4 wie ein Polaroid
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > 20) history.current.shift();
    drawing.current = true;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setIsEmpty(false);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function undo() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const prev = history.current.pop();
    if (prev) {
      ctx.putImageData(prev, 0, 0);
      if (history.current.length === 0) setIsEmpty(true);
    }
  }

  function submit() {
    canvasRef.current!.toBlob(
      (blob) => blob && onDone(blob),
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full touch-none rounded-2xl bg-white"
        style={{ aspectRatio: "3 / 4" }}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Farbe ${c}`}
              className="h-8 w-8 rounded-full border-2 transition"
              style={{
                backgroundColor: c,
                borderColor: color === c ? primaryColor : "rgba(255,255,255,0.4)",
                transform: color === c ? "scale(1.15)" : undefined,
              }}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              aria-label={`Stiftgröße ${s}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition"
              style={{ outline: size === s ? `2px solid ${primaryColor}` : undefined }}
            >
              <span className="rounded-full bg-white" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-white/10 py-3 font-semibold text-white">
          Abbrechen
        </button>
        <button type="button" onClick={undo} className="flex-1 rounded-xl bg-white/10 py-3 font-semibold text-white">
          ↩︎ Rückgängig
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isEmpty}
          className="flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: primaryColor }}
        >
          Fertig
        </button>
      </div>
    </div>
  );
}
