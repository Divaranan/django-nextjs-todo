"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function GoogleButton({ onCredential, onError }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(0);

  // Google's button needs a pixel width (200 - 400): match the form width
  useEffect(() => {
    if (boxRef.current) {
      setWidth(Math.max(200, Math.min(400, Math.floor(boxRef.current.offsetWidth))));
    }
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <div className="dream-divider">
        <span>or</span>
      </div>
      <div className="google-box" ref={boxRef}>
        {width > 0 && (
          <GoogleLogin
            onSuccess={(res) => onCredential(res.credential)}
            onError={() => onError("Google sign-in failed. Please try again.")}
            theme="filled_black"
            shape="pill"
            size="large"
            text="continue_with"
            width={String(width)}
          />
        )}
      </div>
    </>
  );
}