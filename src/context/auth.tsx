"use client";

import { auth } from "@/lib/firebase/client";
import {
  ParsedToken,
  signInWithCustomToken,
  User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { removeToken, setToken } from "./actions";

type AuthContextType = {
  currentUser: User | null;
  loginWithTelegram: (initData: string) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
  customClaims: ParsedToken | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customClaims, setCustomClaims] = useState<ParsedToken | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: User | null) => {
      setCurrentUser(user ?? null);
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        const token = tokenResult.token;
        const refreshToken = user.refreshToken;
        const claims = tokenResult.claims;
        setCustomClaims(claims ?? null);
        if (token && refreshToken) {
          await setToken({
            token,
            refreshToken,
          });
        }
      } else {
        await removeToken();
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await auth.signOut();
  }, []);

  const loginWithTelegram = useCallback(
    async (initData: string) => {
      try {
        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        const data = (await response.json()) as {
          customToken?: string;
          error?: string;
        };

        if (data.customToken) {
          await signInWithCustomToken(auth, data.customToken);
          return { success: true, error: null };
        }

        console.error("Server can't provide custom token:", data.error);
        return {
          success: false,
          error: data.error || "An unknown error occurred during Telegram sign-in.",
        };
      } catch (error) {
        console.error("Error during Telegram login:", error);
        return {
          success: false,
          error: "A Telegram sign-in error occurred.",
        };
      }
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        logout,
        customClaims,
        loginWithTelegram,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
