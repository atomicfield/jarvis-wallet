"use client";

import { auth } from "@/lib/firebase/client";
import {
  ParsedToken,
  signInWithCustomToken,
  User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { removeToken, setToken } from "./actions";

type AuthContextType = {
  currentUser: User | null;
  loginWithTelegram: (initData: TelegramInitData) => Promise<void>;
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

  const logout = async () => {
    await auth.signOut();
  };

  const loginWithTelegram = async (initData:TelegramInitData) => {
  try {
    // 1. initData'yı kendi sunucunuza gönderip Custom Token isteyin
    const response = await fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });

    const data = await response.json();

    if (data.customToken) {
      // 2. Sunucudan gelen token ile Firebase'e giriş yapın
      await signInWithCustomToken(auth, data.customToken);
      console.log("Firebase girişi başarılı!");
    } else {
      console.error("Sunucu token üretemedi.");
    }
  } catch (error) {
    console.error("Telegram ile giriş yapılırken hata:", error);
  }
};

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
