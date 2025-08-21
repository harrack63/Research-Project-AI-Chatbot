"use client";

import { useState, useEffect } from "react";
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getUserData, 
  isAuthenticated,
  getCurrentUser 
} from "../utils";

interface AuthComponentProps {
  onAuthStateChange: (isLoggedIn: boolean, userData?: any) => void;
}

export default function AuthComponent({ onAuthStateChange }: AuthComponentProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isClient, setIsClient] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      checkAuthStatus();
    }
  }, [isClient]);

  const checkAuthStatus = async () => {
    if (isAuthenticated()) {
      try {
        const user = await getCurrentUser();
        setUserData(user);
        setIsLoggedIn(true);
        onAuthStateChange(true, user);
      } catch (error) {
        console.log("Auth check failed, logging out:", error.message);
        // Token is invalid/expired, clear everything and set logged out state
        setUserData(null);
        setIsLoggedIn(false);
        onAuthStateChange(false);
      }
    } else {
      // No valid token, check if we have saved user data for display
      const savedUserData = getUserData();
      if (savedUserData) {
        // Clear saved data since token is invalid
        console.log("Token expired, clearing saved user data");
      }
      setUserData(null);
      setIsLoggedIn(false);
      onAuthStateChange(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginUser({ email, password });
      setUserData(response.user);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      onAuthStateChange(true, response.user);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await registerUser({ email, username, password });
      setUserData(response.user);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      onAuthStateChange(true, response.user);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUserData(null);
    setIsLoggedIn(false);
    onAuthStateChange(false);
    setLoading(false);
  };

  const resetForm = () => {
    setEmail("");
    setUsername("");
    setPassword("");
    setError("");
  };

  const handleCloseModal = () => {
    setShowAuthModal(false);
    resetForm();
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    setError("");
  };

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="bg-blue-500 text-white px-4 py-2 rounded opacity-50">
        Loading...
      </div>
    );
  }

  if (isLoggedIn && userData) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">
          Welcome, {userData.username}!
        </span>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {loading ? "Logging out..." : "Logout"}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowAuthModal(true)}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      >
        Login
      </button>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {authMode === 'login' ? 'Login' : 'Register'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              {authMode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Choose a username"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading 
                    ? (authMode === 'login' ? 'Logging in...' : 'Registering...') 
                    : (authMode === 'login' ? 'Login' : 'Register')
                  }
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={switchAuthMode}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {authMode === 'login' 
                  ? "Don't have an account? Register" 
                  : "Already have an account? Login"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}