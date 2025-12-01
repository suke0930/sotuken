/**
 * Frontend JavaScript for Auth.js Demo
 * Handles session checks, user info display, and logout
 */

/**
 * Check if user is authenticated
 * @returns {Promise<Object|null>} Session object or null
 */
async function checkAuth() {
  try {
    const response = await fetch("/api/session");
    const data = await response.json();
    return data.session;
  } catch (error) {
    console.error("Failed to check authentication:", error);
    return null;
  }
}

/**
 * Load user information and display on dashboard
 */
async function loadUserInfo() {
  const loading = document.getElementById("loading");
  const userInfo = document.getElementById("user-info");
  const sessionInfo = document.getElementById("session-info");

  try {
    const response = await fetch("/api/me");

    if (!response.ok) {
      // Not authenticated, redirect to home
      window.location.href = "/";
      return;
    }

    const data = await response.json();
    const user = data.user;

    if (!user) {
      window.location.href = "/";
      return;
    }

    // Hide loading, show user info
    loading.style.display = "none";
    userInfo.style.display = "block";
    sessionInfo.style.display = "block";

    // Display user information
    document.getElementById("username").textContent = user.name || "N/A";
    document.getElementById("email").textContent = user.email || "N/A";
    document.getElementById("user-id").textContent = user.id || "N/A";

    // Display avatar
    if (user.image) {
      document.getElementById("avatar").src = user.image;
    }

    // Get full profile for session expiry
    const profileResponse = await fetch("/api/profile");
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      if (profileData.expires) {
        const expiryDate = new Date(profileData.expires);
        document.getElementById("expires").textContent = expiryDate.toLocaleString("ja-JP");
      }
    }
  } catch (error) {
    console.error("Failed to load user info:", error);
    loading.innerHTML = "<p style='color: red;'>ユーザー情報の読み込みに失敗しました</p>";
  }
}

/**
 * Logout user
 */
function logout() {
  // Redirect to Auth.js signout endpoint
  window.location.href = "/auth/signout";
}

/**
 * Test protected API endpoint
 */
async function testProtectedApi() {
  const responseElement = document.getElementById("api-response");

  try {
    const response = await fetch("/api/profile");
    const data = await response.json();

    responseElement.textContent = JSON.stringify(data, null, 2);
    responseElement.style.display = "block";
  } catch (error) {
    responseElement.textContent = `Error: ${error.message}`;
    responseElement.style.display = "block";
  }
}

/**
 * Protect page - redirect if not authenticated
 * Call this on protected pages
 */
async function protectPage() {
  const session = await checkAuth();
  if (!session) {
    window.location.href = "/";
  }
}
