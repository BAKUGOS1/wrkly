'use client';

import { GoogleOAuthProvider as GoogleProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export function GoogleOAuthProvider({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_CLIENT_ID) {
    // If not configured, render children without wrapping (OAuth button will show warning)
    return <>{children}</>;
  }
  return <GoogleProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleProvider>;
}
