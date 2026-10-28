"use client";

import { useEffect, useState } from "react";

// Returns the current time and refreshes it every `intervalMs`.
// It starts at 0 and gets the real time right after the page loads in the
// browser (Date.now() must not run during Next.js pre-rendering).
export default function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}