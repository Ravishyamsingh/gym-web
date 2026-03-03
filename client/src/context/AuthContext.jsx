import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  // Helper: determine if onboarding is fully complete
  const checkOnboardingComplete = (user) => {
    if (!user) return false;
    const hasFace = user.faceRegistered === true;
    const hasPaid = user.paymentStatus === "active";
    return hasFace && hasPaid;
  };

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const { data } = await api.get("/users/me");
          setDbUser(data.user);
          setProfileComplete(checkOnboardingComplete(data.user));
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
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password);
    } catch (fbErr) {
      // If Firebase user already exists (e.g., previous failed registration),
      // try signing in instead and then register in MongoDB
      if (fbErr.code === "auth/email-already-in-use") {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw fbErr;
      }
    }
    await updateProfile(cred.user, { displayName: name });

    // Create the MongoDB user document (may already exist — handle 409)
    try {
      const { data } = await api.post("/auth/register", {
        firebaseId: cred.user.uid,
        name,
        email,
        faceDescriptor,
      });
      setDbUser(data.user);
      return data.user;
    } catch (regErr) {
      // If user already exists in Mongo, just login instead
      if (regErr.response?.status === 409) {
        const { data } = await api.post("/auth/login", {
          firebaseId: cred.user.uid,
        });
        setDbUser(data.user);
        setProfileComplete(checkOnboardingComplete(data.user));
        return data.user;
      }
      throw regErr;
    }
  };

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    const { data } = await api.post("/auth/login", {
      firebaseId: cred.user.uid,
    });
    setDbUser(data.user);
    setProfileComplete(checkOnboardingComplete(data.user));
    return data.user;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    // Use the dedicated Google auth endpoint that handles both login and registration
    const { data } = await api.post("/auth/google", {
      name: cred.user.displayName || cred.user.email.split("@")[0],
      email: cred.user.email,
    });

    setDbUser(data.user);
    setProfileComplete(checkOnboardingComplete(data.user));
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
      setProfileComplete(checkOnboardingComplete(data.user));
    } catch {
      /* no-op */
    }
  };

  // Helper to determine where to redirect after auth
  // After login, users always go to dashboard first
  const getOnboardingRedirect = (user) => {
    const u = user || dbUser;
    if (!u) return "/login";
    if (u.role === "admin") return "/admin";
    // All authenticated users go to dashboard first
    return "/dashboard";
  };

  const value = {
    firebaseUser,
    dbUser,
    loading,
    profileComplete,
    signup,
    login,
    loginWithGoogle,
    logout,
    refreshProfile,
    getOnboardingRedirect,
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
