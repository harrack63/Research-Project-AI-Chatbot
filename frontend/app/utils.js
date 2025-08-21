/**
 * Chat API utilities
 */

/**
 * Get the backend URL from environment variables or use default
 * @returns {string} The backend URL
 */
export function getBackendUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
}

/**
 * Send a chat message to the backend API
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<Object>} Response data from the backend
 * @throws {Error} If the request fails
 */
export async function sendChatMessage(messages) {
  const backendUrl = getBackendUrl();
  const token = getAuthToken();

  console.log("Sending message to backend");

  const headers = {
    "Content-Type": "application/json",
  };

  // Add authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${backendUrl}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages }),
  });

  console.log("Response from backend", response);

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid, clear auth data
      removeAuthToken();
      
      // Show alert and refresh page
      alert("Your session has expired. Please login again.");
      window.location.reload();
      return;
    }
    throw new Error(`Backend error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Handle chat message sending with error handling
 * @param {Array} messages - Current messages array
 * @param {string} userInput - User's input message
 * @param {Function} setMessages - Function to update messages state
 * @param {Function} setLoading - Function to update loading state
 * @returns {Promise<void>}
 */
export async function handleSendMessage(messages, userInput, setMessages, setLoading) {
  if (!userInput.trim()) return;

  const newMessages = [...messages, { role: "user", content: userInput }];
  setMessages(newMessages);
  setLoading(true);

  try {
    const data = await sendChatMessage(newMessages);
    const updatedMessages = data.messages || [];
    setMessages(updatedMessages);
  } catch (err) {
    console.error("Error sending message:", err);
    setMessages([
      ...messages,
      { role: "user", content: userInput },
      { role: "assistant", content: "Sorry, there was an error." },
    ]);
  } finally {
    setLoading(false);
  }
}

/**
 * Authentication API functions
 */

/**
 * Get authentication token from localStorage
 * @returns {string|null} The stored token or null
 */
export function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

/**
 * Store authentication token in localStorage
 * @param {string} token - The JWT token to store
 */
export function setAuthToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

/**
 * Remove authentication token from localStorage
 */
export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }
}

/**
 * Store user data in localStorage
 * @param {Object} userData - The user data to store
 */
export function setUserData(userData) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_data', JSON.stringify(userData));
  }
}

/**
 * Get user data from localStorage
 * @returns {Object|null} The stored user data or null
 */
export function getUserData() {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
  return null;
}

/**
 * Register a new user
 * @param {Object} userData - Object containing email, username, password
 * @returns {Promise<Object>} Response data from the backend
 * @throws {Error} If the request fails
 */
export async function registerUser(userData) {
  const backendUrl = getBackendUrl();

  console.log("Registering user with backend");

  const response = await fetch(`${backendUrl}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || `Registration failed: ${response.status}`);
  }

  // Store token and user data
  setAuthToken(data.access_token);
  setUserData(data.user);

  return data;
}

/**
 * Login user
 * @param {Object} credentials - Object containing email and password
 * @returns {Promise<Object>} Response data from the backend
 * @throws {Error} If the request fails
 */
export async function loginUser(credentials) {
  const backendUrl = getBackendUrl();

  console.log("Logging in user with backend");

  const response = await fetch(`${backendUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || `Login failed: ${response.status}`);
  }

  // Store token and user data
  setAuthToken(data.access_token);
  setUserData(data.user);

  return data;
}

/**
 * Logout user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  const backendUrl = getBackendUrl();
  const token = getAuthToken();

  try {
    if (token) {
      await fetch(`${backendUrl}/auth/logout`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error("Logout API error:", error);
  } finally {
    // Always clear local storage regardless of API response
    removeAuthToken();
  }
}

/**
 * Get current user information
 * @returns {Promise<Object>} User data from the backend
 * @throws {Error} If the request fails
 */
export async function getCurrentUser() {
  const backendUrl = getBackendUrl();
  const token = getAuthToken();

  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(`${backendUrl}/auth/me`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      removeAuthToken();
    }
    throw new Error(data.detail || `Failed to get user info: ${response.status}`);
  }

  return data;
}

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
export function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    // Decode JWT payload (without verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired (exp is in seconds)
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // If can't decode, consider expired
  }
}

/**
 * Get token expiration time and remaining time
 * @returns {Object|null} Token expiration info or null
 */
export function getTokenExpirationInfo() {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expTime = new Date(payload.exp * 1000);
    const currentTime = new Date();
    const remainingMs = expTime.getTime() - currentTime.getTime();
    const remainingMinutes = Math.floor(remainingMs / 60000);
    const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
    
    return {
      expiration: expTime,
      current: currentTime,
      remainingMs,
      remainingMinutes,
      remainingSeconds,
      isExpired: remainingMs <= 0
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    return null;
  }
}

/**
 * Check if user is authenticated with valid token
 * @returns {boolean} True if user has a valid, non-expired token
 */
export function isAuthenticated() {
  const token = getAuthToken();
  if (!token) return false;
  
  // Check if token is expired
  if (isTokenExpired(token)) {
    removeAuthToken(); // Auto-cleanup expired token
    return false;
  }
  
  return true;
} 