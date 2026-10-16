import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  loginRequest,
  logoutRequest,
  registerRequest,
} from "../../services/authApi";

import {
  axios,
  setCsrfToken,
  setUnauthorizedHandler,
} from "../../services/api";

import type { AuthUser } from "../../types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    displayName: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let sessionLoad: Promise<AuthUser | null> | null = null;

function loadSession(): Promise<AuthUser | null> {
  if (!sessionLoad) {
    sessionLoad = getCurrentUser()
      .then(({ data }) => {
        setCsrfToken(data.csrfToken);
        return data.user;
      })
      .catch((error: unknown) => {
        const status = axios.isAxiosError(error)
          ? error.response?.status
          : undefined;

        if (status === 401) {
          setCsrfToken("");
          return null;
        }

        throw error;
      })
      .finally(() => {
        sessionLoad = null;
      });
  }

  return sessionLoad;
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  const clearSession = useCallback(() => {
    setCsrfToken("");
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);

    let mounted = true;

    void loadSession()
      .then((currentUser) => {
        if (mounted) {
          setUser(currentUser);
          setSessionError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setSessionError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await loginRequest({ email, password });

      setCsrfToken(data.csrfToken);
      setUser(data.user);
      setSessionError(false);
    },
    [],
  );

  const register = useCallback(
    async (
      email: string,
      displayName: string,
      password: string,
    ) => {
      const { data } = await registerRequest({
        email,
        displayName,
        password,
      });

      setCsrfToken(data.csrfToken);
      setUser(data.user);
      setSessionError(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;

      if (status !== 401) {
        throw error;
      }
    }

    clearSession();
    setSessionError(false);
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {sessionError && !loading && !user ? (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg border border-amber-500/30 bg-slate-900 p-4 text-sm text-amber-200 shadow-xl"
        >
          Unable to verify your session. Check your connection and refresh the page.
        </div>
      ) : null}

      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
