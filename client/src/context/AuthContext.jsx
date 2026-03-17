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
        // Password/JWT sessions have no Firebase user; restore from JWT when available.
        const jwtToken = localStorage.getItem("jwtToken");
        if (jwtToken) {
          try {
            const { data } = await api.get("/users/me");
            setDbUser(data.user);
            setProfileComplete(checkOnboardingComplete(data.user));
          } catch {
            localStorage.removeItem("jwtToken");
            setDbUser(null);
            setProfileComplete(false);
          }
        } else {
          setDbUser(null);
          setProfileComplete(false);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ──────────────────────────────────────────────────────────────────
  // PASSWORD-BASED AUTHENTICATION
  // ──────────────────────────────────────────────────────────────────

  /**
   * Login with email/userId and password (password-based auth)
   */
  const loginWithPassword = async (credentials, password) => {
    try {
      // For password-based auth, we make direct API call
      const response = await api.post("/auth/login", {
        ...credentials,
        password,
      });

      const user = response.data.user;
      const jwtToken = response.data.jwtToken;

      // Store JWT token for subsequent API calls
      if (jwtToken) {
        localStorage.setItem("jwtToken", jwtToken);
      }

      setDbUser(user);
      setProfileComplete(checkOnboardingComplete(user));

      return user;
    } catch (err) {
      console.error("Password login error:", err);
      throw err;
    }
  };

  /**
   * Signup with email, userId, password, and name
   */
  const signupWithPassword = async (email, userId, password, name) => {
    try {
      const response = await api.post("/auth/register", {
        email,
        userId,
        password,
        name,
      });

      const user = response.data.user;
      const jwtToken = response.data.jwtToken;

      // Store JWT token for subsequent API calls
      if (jwtToken) {
        localStorage.setItem("jwtToken", jwtToken);
      }

      setDbUser(user);

      return user;
    } catch (err) {
      console.error("Password signup error:", err);
      throw err;
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // FIREBASE & GOOGLE AUTHENTICATION (LEGACY)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Legacy: Signup with Firebase email/password + name
   */
  const signup = async (email, password, name, faceDescriptor = []) => {
    localStorage.removeItem("jwtToken");
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password);
    } catch (fbErr) {
      if (fbErr.code === "auth/email-already-in-use") {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw fbErr;
      }
    }
    await updateProfile(cred.user, { displayName: name });

    // Ensure token is fresh
    const idToken = await cred.user.getIdToken(true);
    console.log("[AUTH] Firebase signup successful");

    try {
      const { data } = await api.post("/auth/firebase/register", {
        name,
        email,
        faceDescriptor,
      });
      setDbUser(data.user);
      return data.user;
    } catch (regErr) {
      if (regErr.response?.status === 409) {
        const { data } = await api.post("/auth/firebase/login", {});
        setDbUser(data.user);
        setProfileComplete(checkOnboardingComplete(data.user));
        return data.user;
      }
      throw regErr;
    }
  };

  /**
   * Legacy: Login with Firebase email/password
   */
  const login = async (email, password) => {
    try {
      localStorage.removeItem("jwtToken");
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Ensure token is fresh
      const idToken = await cred.user.getIdToken(true);
      console.log("[AUTH] Firebase login successful");

      const { data } = await api.post("/auth/firebase/login", {});

      setDbUser(data.user);
      setProfileComplete(checkOnboardingComplete(data.user));
      return data.user;
    } catch (err) {
      console.error("[AUTH] Firebase login error:", err);
      throw err;
    }
  };

  /**
   * Google OAuth login
   */
  const loginWithGoogle = async () => {
    localStorage.removeItem("jwtToken");
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    // Ensure token is fresh
    const idToken = await cred.user.getIdToken(true);
    console.log("[AUTH] Google sign-in successful");

    const { data } = await api.post("/auth/google", {
      name: cred.user.displayName || cred.user.email.split("@")[0],
      email: cred.user.email,
    });

    localStorage.removeItem("jwtToken");
    setDbUser(data.user);
    setProfileComplete(checkOnboardingComplete(data.user));
    return data.user;
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem("jwtToken");
    setDbUser(null);
  };

  /** Refresh the MongoDB profile */
  const refreshProfile = async () => {
    try {
      const { data } = await api.get("/users/me");
      setDbUser(data.user);
      setProfileComplete(checkOnboardingComplete(data.user));
    } catch {
      /* no-op */
    }
  };

  /**
   * Determine redirect after auth
   */
  const getOnboardingRedirect = (user) => {
    const u = user || dbUser;
    if (!u) return "/login";
    if (u.role === "admin") return "/admin";
    return "/dashboard";
  };

  const value = {
    firebaseUser,
    dbUser,
    loading,
    profileComplete,
    // Password-based auth
    loginWithPassword,
    signupWithPassword,
    // Legacy Firebase auth
    signup,
    login,
    loginWithGoogle,
    logout,
    refreshProfile,
    getOnboardingRedirect,
    isAdmin: dbUser?.role === "admin",
    isAuthenticated: !!dbUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
