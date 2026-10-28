"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/context/AuthContext";
import MagneticEffect from "@/components/MagneticEffect";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function Providers({ children }) {
  const content = (
    <AuthProvider>
      <MagneticEffect />
      {children}
    </AuthProvider>
  );

  // Only load Google's script when a client id is configured
  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider>
  ) : (
    content
  );
}