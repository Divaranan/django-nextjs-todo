"use client";

import { useEffect, useRef } from "react";

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let w = 0, h = 0, waterY = 0, t = 0, raf = 0;
    let stars = [], clouds = [], orbs = [], drops = [], ripples = [];

    const rand = (a, b) => a + Math.random() * (b - a);

    // Mountain layers (far -> near), they drift at different speeds
    const layers = [
      { color: "#3b2a66", amp: 0.16, base: 0.60, f1: 0.0030, f2: 0.0075, speed: 6 },
      { color: "#2a1f4f", amp: 0.13, base: 0.645, f1: 0.0042, f2: 0.0100, speed: 12 },
      { color: "#171233", amp: 0.10, base: 0.68, f1: 0.0058, f2: 0.0130, speed: 20 },
    ];

    function init() {
      waterY = h * 0.68;
      stars = Array.from({ length: 90 }, () => ({
        x: rand(0, w),
        y: rand(0, waterY * 0.7),
        r: rand(0.4, 1.4),
        tw: rand(0.5, 2),
        ph: rand(0, 6.28),
      }));
      clouds = Array.from({ length: 5 }, () => ({
        x: rand(0, w),
        y: rand(h * 0.08, h * 0.35),
        s: rand(120, 260),
        v: rand(4, 10),
      }));
      orbs = Array.from({ length: 16 }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        r: rand(3, 9),
        vx: rand(-25, 25),
        vy: rand(-25, 25),
        ph: rand(0, 6.28),
        hue: rand(160, 300),
      }));
      drops = [];
      ripples = [];
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    }

    function drawSky() {
      const g = ctx.createLinearGradient(0, 0, 0, waterY);
      g.addColorStop(0, "#090d24");
      g.addColorStop(0.55, "#3a2060");
      g.addColorStop(1, "#d9707a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, waterY + 2);

      for (const s of stars) {
        const a = 0.5 + 0.5 * Math.sin(t * s.tw + s.ph);
        ctx.fillStyle = `rgba(255,255,255,${0.25 + a * 0.6})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fill();
      }
    }

    function drawMoon() {
      const mx = w * 0.78;
      const my = waterY * 0.32;
      const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 150);
      glow.addColorStop(0, "rgba(255,246,216,0.35)");
      glow.addColorStop(1, "rgba(255,246,216,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(mx - 160, my - 160, 320, 320);
      ctx.fillStyle = "#fff6d8";
      ctx.beginPath();
      ctx.arc(mx, my, 34, 0, 6.283);
      ctx.fill();
    }

    function drawClouds(dt) {
      for (const c of clouds) {
        c.x += c.v * dt;
        if (c.x - c.s > w) c.x = -c.s;
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(
            c.x + i * c.s * 0.35,
            c.y + (i % 2) * 8,
            c.s * 0.4,
            c.s * 0.12,
            0, 0, 6.283
          );
          ctx.fill();
        }
      }
    }

    function drawMountains() {
      for (const L of layers) {
        const o = t * L.speed;
        ctx.beginPath();
        ctx.moveTo(0, waterY + 20);
        for (let x = 0; x <= w + 6; x += 6) {
          const k =
            0.55 * Math.sin((x + o) * L.f1) +
            0.3 * Math.sin((x + o) * L.f2 + 1.7) +
            0.6;
          ctx.lineTo(x, h * L.base - h * L.amp * k);
        }
        ctx.lineTo(w, waterY + 20);
        ctx.closePath();
        ctx.fillStyle = L.color;
        ctx.fill();
      }
    }

    function drawWater() {
      const g = ctx.createLinearGradient(0, waterY, 0, h);
      g.addColorStop(0, "#3a2a63");
      g.addColorStop(1, "#080b1c");
      ctx.fillStyle = g;
      ctx.fillRect(0, waterY, w, h - waterY);

      // shimmering moon reflection
      const mx = w * 0.78;
      const step = (h - waterY) / 16;
      for (let i = 0; i < 14; i++) {
        const y = waterY + 12 + i * step;
        const width = 30 + i * 5 + Math.sin(t * 2 + i) * 12;
        ctx.fillStyle = `rgba(255,246,216,${0.28 - i * 0.018})`;
        ctx.fillRect(mx - width / 2, y, width, 2);
      }
    }

    function drawRain(dt) {
      // new drop
      if (!reduceMotion && Math.random() < dt * 4) {
        drops.push({
          x: rand(0, w),
          y: -10,
          ty: rand(waterY + 15, h - 10),
          v: rand(500, 800),
        });
      }

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += d.v * dt;
        if (d.y >= d.ty) {
          ripples.push({ x: d.x, y: d.ty, r: 0, max: rand(50, 90) });
          drops.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = "rgba(190,220,255,0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - 14);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 45 * dt;
        if (r.r > r.max) {
          ripples.splice(i, 1);
          continue;
        }
        const a = 1 - r.r / r.max;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(190,225,255,${a * 0.6})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, 6.283);
        ctx.stroke();
        ctx.strokeStyle = `rgba(190,225,255,${a * 0.35})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.r * 0.6, r.r * 0.18, 0, 0, 6.283);
        ctx.stroke();
      }
    }

    function drawOrbs(dt) {
      for (const o of orbs) {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        // bounce off the screen edges
        if (o.x < o.r || o.x > w - o.r) o.vx *= -1;
        if (o.y < o.r || o.y > h - o.r) o.vy *= -1;

        const a = 0.35 + 0.25 * Math.sin(t * 1.5 + o.ph);
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 4);
        g.addColorStop(0, `hsla(${o.hue},90%,78%,${a})`);
        g.addColorStop(1, `hsla(${o.hue},90%,78%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * 4, 0, 6.283);
        ctx.fill();
      }
    }

    function draw(dt) {
      drawSky();
      drawMoon();
      drawClouds(dt);
      drawMountains();
      drawWater();
      drawRain(dt);
      drawOrbs(dt);
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      draw(dt);
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    if (reduceMotion) draw(0);
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="scene-canvas" />;
}