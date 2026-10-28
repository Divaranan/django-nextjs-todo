"use client";

import { useEffect } from "react";

// Which elements should be pulled toward the cursor
const SELECTOR = ".dream-field, .dream-btn";

const RADIUS = 110;   // how far from the element the pull starts (px)
const STRENGTH = 0.28; // how strongly it follows the cursor
const MAX_X = 14;      // max sideways movement (px)
const MAX_Y = 10;      // max up/down movement (px)
const POP = 1.05;      // scale when cursor is on the element

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function MagneticEffect() {
  useEffect(() => {
    // No magnet effect on touch screens or if the user prefers less motion
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let mouse = null;
    let raf = 0;

    function reset(el) {
      if (el._tx || el._ty || el._s) {
        el.style.transform = "";
        el.classList.remove("is-hot");
        el._tx = 0;
        el._ty = 0;
        el._s = 0;
      }
    }

    function update() {
      raf = 0;
      const els = document.querySelectorAll(SELECTOR);

      els.forEach((el) => {
        if (!mouse) {
          reset(el);
          return;
        }

        const rect = el.getBoundingClientRect();
        const tx = el._tx || 0;
        const ty = el._ty || 0;

        // real center of the element (without our own movement)
        const cx = rect.left + rect.width / 2 - tx;
        const cy = rect.top + rect.height / 2 - ty;
        const dx = mouse.x - cx;
        const dy = mouse.y - cy;

        const inside =
          Math.abs(dx) < rect.width / 2 && Math.abs(dy) < rect.height / 2;
        const reach = Math.max(rect.width, rect.height) / 2 + RADIUS;

        if (Math.hypot(dx, dy) > reach) {
          reset(el);
          return;
        }

        const nx = clamp(dx * STRENGTH, -MAX_X, MAX_X);
        const ny = clamp(dy * STRENGTH, -MAX_Y, MAX_Y);
        const scale = inside ? POP : 1;

        el._tx = nx;
        el._ty = ny;
        el._s = scale;
        el.style.transform = `translate(${nx}px, ${ny}px) scale(${scale})`;
        el.classList.toggle("is-hot", inside);
      });
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(update);
    }

    function onMove(e) {
      mouse = { x: e.clientX, y: e.clientY };
      schedule();
    }

    function onLeave() {
      mouse = null;
      schedule();
    }

    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}