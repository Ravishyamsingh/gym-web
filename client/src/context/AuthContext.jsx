import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const { data } = await api.get("/users/me");
          setDbUser(data.user);
          // Check if profile is complete (has face descriptor)
          const isComplete = data.user?.faceDescriptor && data.user.faceDescriptor.length === 128;
          setProfileComplete(isComplete);
        } catch {
          // User exists in Firebase but not in MongoDB yet (onboarding needed)
          setDbUser(null);
          setProfileComplete(false);
        }
      } else {
        setDbUser(null);
        setProfileComplete(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Auth helpers ──────────────────────────
  const signup = async (email, password, name, faceDescriptor = []) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Create the MongoDB user document
    const { data } = await api.post("/auth/register", {
      firebaseId: cred.user.uid,
      name,
      email,
      faceDescriptor,
    });
    setDbUser(data.user);
    return data.user;
  };

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    const { data } = await api.post("/auth/login", {
      firebaseId: cred.user.uid,
    });
    setDbUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await signOut(auth);
    setDbUser(null);
  };

  /** Refresh the MongoDB profile (call after face-descriptor update, etc.) */
  const refreshProfile = async () => {
    try {
      const { data } = await api.get("/users/me");
      setDbUser(data.user);
      // Update profile complete status
      const isComplete = data.user?.faceDescriptor && data.user.faceDescriptor.length === 128;
      setProfileComplete(isComplete);
    } catch {
      /* no-op */
    }
  };

  const value = {
    firebaseUser,
    dbUser,
    loading,
    profileComplete,
    signup,
    login,
    logout,
    refreshProfile,
    isAdmin: dbUser?.role === "admin",
    isAuthenticated: !!firebaseUser && !!dbUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
