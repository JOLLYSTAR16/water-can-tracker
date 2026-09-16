import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const API_URL = import.meta.env.VITE_API_URL;

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Invalid username or password.");
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", String(data.user_id));
      localStorage.setItem("user_name", data.name);
      localStorage.setItem(
        "username",
        data.username || username.trim()
      );
      localStorage.setItem("role", data.role);

      if (data.must_change_password) {
        navigate("/change-password");
        return;
      }

      if (data.role === "admin") {
        navigate("/admin");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        "Unable to connect to the server. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-background-glow login-glow-one"></div>
      <div className="login-background-glow login-glow-two"></div>

      <div className="login-card">

        <div className="login-top-line"></div>

        <div className="login-logo-wrapper">
          <div className="login-logo">
            💧
          </div>
        </div>

        <div className="login-header">
          <span className="login-eyebrow">
            HOUSE MANAGEMENT
          </span>

          <h1>
            Water Can Tracker
          </h1>

          <p>
            Sign in to manage your water-can turn
          </p>
        </div>

        {error && (
          <div className="login-error">
            <span className="login-error-icon">
              ⚠
            </span>

            <p>
              {error}
            </p>
          </div>
        )}

        <form
          className="login-form"
          onSubmit={handleLogin}
        >

          <div className="form-group">

            <label htmlFor="username">
              Username
            </label>

            <div className="login-input-wrapper">

              <span className="login-input-icon">
                👤
              </span>

              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                autoComplete="username"
                disabled={loading}
              />

            </div>

          </div>


          <div className="form-group">

            <label htmlFor="password">
              Password
            </label>

            <div className="login-input-wrapper">

              <span className="login-input-icon">
                🔒
              </span>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="button"
                className="show-password-button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                title={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? "🙈" : "👁"}
              </button>

            </div>

          </div>


          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <span className="login-spinner"></span>
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <span className="login-button-arrow">
                  →
                </span>
              </>
            )}

          </button>

        </form>


        <div className="login-divider">
          <span></span>
          <p>SECURE ACCESS</p>
          <span></span>
        </div>


        <div className="login-footer">

          <span className="login-footer-icon">
            💧
          </span>

          <p>
            Shared Water Can Management
          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;