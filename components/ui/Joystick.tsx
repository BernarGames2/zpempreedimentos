"use client";

import { useEffect, useRef, useState } from "react";
import { joystick } from "@/lib/controles";

/** Joystick virtual do passeio: arrastar o botão anda na direção indicada (frente, trás e lados). */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const dedo = useRef<number | null>(null);
  const [p, setP] = useState({ x: 0, y: 0 });

  useEffect(
    () => () => {
      joystick.x = 0;
      joystick.y = 0;
      joystick.ativo = false;
    },
    [],
  );

  const mover = (ev: React.PointerEvent) => {
    const b = base.current;
    if (!b || dedo.current !== ev.pointerId) return;
    const r = b.getBoundingClientRect();
    const raio = r.width / 2;
    let dx = ev.clientX - (r.left + raio);
    let dy = ev.clientY - (r.top + raio);
    const d = Math.hypot(dx, dy);
    if (d > raio) {
      dx = (dx / d) * raio;
      dy = (dy / d) * raio;
    }
    joystick.x = dx / raio;
    joystick.y = dy / raio;
    joystick.ativo = true;
    setP({ x: dx, y: dy });
  };
  const soltar = (ev: React.PointerEvent) => {
    if (dedo.current !== ev.pointerId) return;
    dedo.current = null;
    joystick.x = 0;
    joystick.y = 0;
    joystick.ativo = false;
    setP({ x: 0, y: 0 });
  };

  return (
    <div
      ref={base}
      aria-label="Joystick: arraste para andar pelo apartamento"
      data-testid="joystick"
      className="vidro pointer-events-auto relative h-28 w-28 shrink-0 touch-none select-none rounded-full border border-white/15"
      onPointerDown={(ev) => {
        dedo.current = ev.pointerId;
        ev.currentTarget.setPointerCapture(ev.pointerId);
        mover(ev);
      }}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      {["top-1.5 left-1/2 -translate-x-1/2", "bottom-1.5 left-1/2 -translate-x-1/2 rotate-180", "left-1.5 top-1/2 -translate-y-1/2 -rotate-90", "right-1.5 top-1/2 -translate-y-1/2 rotate-90"].map((c) => (
        <span key={c} aria-hidden className={`absolute h-0 w-0 border-x-[5px] border-b-[6px] border-x-transparent border-b-white/45 ${c}`} />
      ))}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-ambar shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
        style={{ transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))` }}
      />
    </div>
  );
}
