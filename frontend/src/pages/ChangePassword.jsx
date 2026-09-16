import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ChangePassword.css";

const API_URL = import.meta.env.VITE_API_URL;

function ChangePassword() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("New password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Password change failed.");
      }

      setSuccess("Password changed successfully!");

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">

      <div className="change-password-card">

        <div className="password-icon">
          🔐
        </div>

        <h1>Create Your Password</h1>

        <p className="change-subtitle">
          This is your first login. Please change your default password
          before continuing.
        </p>

        <form onSubmit={handleChangePassword}>

          <div className="password-input-group">
            <label>Current Password</label>

            <input
              type="password"
              placeholder="Enter default password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="password-input-group">
            <label>New Password</label>

            <input
              type="password"
              placeholder="Create a new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="password-input-group">
            <label>Confirm New Password</label>

            <input
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="password-error">
              {error}
            </div>
          )}

          {success && (
            <div className="password-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="password-button"
            disabled={loading}
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>

        </form>

        <p className="password-note">
          Your new password will be securely encrypted.
        </p>

      </div>

    </div>
  );
}

export default ChangePassword;