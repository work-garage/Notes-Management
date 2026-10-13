import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  getCurrentUser,
  fetchUserAttributes,
  resendSignUpCode,
} from 'aws-amplify/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setUser({
        sub: attributes.sub,
        email: attributes.email,
        name: attributes.name,
        username: currentUser.username,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const result = await signIn({ username: email, password });
    if (result.isSignedIn) {
      await loadUser();
    }
    return result;
  };

  const register = async (name, email, password) => {
    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
        },
      },
    });
    return result;
  };

  const confirmRegistration = async (email, code) => {
    const result = await confirmSignUp({ username: email, confirmationCode: code });
    return result;
  };

  const resendCode = async (email) => {
    await resendSignUpCode({ username: email });
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, confirmRegistration, resendCode, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
