import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

function AdminDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Add member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    username: "",
    password: "",
    turn_order: "",
  });
  const [addingMember, setAddingMember] = useState(false);

  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");

  // =========================================================
  // LOAD ADMIN DATA
  // =========================================================

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    if (role !== "admin") {
      navigate("/dashboard");
      return;
    }

    fetchAdminData();
  }, []);

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
  });

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = getHeaders();

      const [
        summaryResponse,
        usersResponse,
        historyResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/admin/summary`, {
          headers,
        }),

        fetch(`${API_URL}/admin/users`, {
          headers,
        }),

        fetch(`${API_URL}/admin/history`, {
          headers,
        }),
      ]);

      if (
        summaryResponse.status === 401 ||
        summaryResponse.status === 403
      ) {
        localStorage.clear();
        navigate("/");
        return;
      }

      if (
        !summaryResponse.ok ||
        !usersResponse.ok ||
        !historyResponse.ok
      ) {
        throw new Error("Unable to load admin dashboard");
      }

      const summaryData = await summaryResponse.json();
      const usersData = await usersResponse.json();
      const historyData = await historyResponse.json();

      setSummary(summaryData);
      setUsers(usersData.users || []);
      setHistory(historyData.history || []);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================================
  // INITIALS
  // =========================================================

  const getInitials = (name) => {
    if (!name) return "?";

    const words = name.trim().split(" ");

    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    return (
      words[0].charAt(0) +
      words[words.length - 1].charAt(0)
    ).toUpperCase();
  };

  // =========================================================
  // SHOW MESSAGE
  // =========================================================

  const showMessage = (message) => {
    setActionMessage(message);

    setTimeout(() => {
      setActionMessage("");
    }, 3500);
  };

  // =========================================================
  // ADD NEW MEMBER
  // =========================================================

  const handleNewMemberChange = (e) => {
    const { name, value } = e.target;

    setNewMember((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAddMember = async (e) => {
    e.preventDefault();

    if (
      !newMember.name.trim() ||
      !newMember.username.trim() ||
      !newMember.password ||
      !newMember.turn_order
    ) {
      setError("Please fill in all member details.");
      return;
    }

    if (newMember.password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    try {
      setAddingMember(true);
      setError("");

      const params = new URLSearchParams({
        name: newMember.name.trim(),
        username: newMember.username.trim(),
        password: newMember.password,
        turn_order: newMember.turn_order,
      });

      const response = await fetch(
        `${API_URL}/admin/users?${params.toString()}`,
        {
          method: "POST",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to create member."
        );
      }

      setNewMember({
        name: "",
        username: "",
        password: "",
        turn_order: "",
      });

      setShowAddMember(false);

      showMessage(
        "New member created successfully."
      );

      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to create member."
      );
    } finally {
      setAddingMember(false);
    }
  };

  // =========================================================
  // RESET PASSWORD
  // =========================================================

  const handleResetPassword = async (user) => {
    const confirmed = window.confirm(
      `Reset the password for ${user.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/admin/users/${user.id}/reset-password`,
        {
          method: "POST",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to reset password."
        );
      }

      window.alert(
        `Password reset successfully.\n\nUsername: ${data.username}\nTemporary Password: ${data.temporary_password}\n\nThe member must change this password after logging in.`
      );

      showMessage(
        `Password reset for ${user.name}.`
      );

      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to reset password."
      );
    }
  };

  // =========================================================
  // ACTIVATE / DEACTIVATE MEMBER
  // =========================================================

  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;

    const actionText = newStatus
      ? "activate"
      : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} ${user.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const params = new URLSearchParams({
        is_active: String(newStatus),
      });

      const response = await fetch(
        `${API_URL}/admin/users/${user.id}/status?${params.toString()}`,
        {
          method: "PATCH",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to update user status."
        );
      }

      showMessage(data.message);

      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to update user status."
      );
    }
  };

  // =========================================================
  // CHANGE CURRENT TURN
  // =========================================================

  const handleChangeTurn = async (user) => {
    const confirmed = window.confirm(
      `Make ${user.name} the current water-can turn?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/admin/current-turn/${user.id}`,
        {
          method: "PATCH",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to change current turn."
        );
      }

      showMessage(
        `${user.name} is now the current turn.`
      );

      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to change current turn."
      );
    }
  };

  // =========================================================
  // CORRECT HISTORY
  // =========================================================

  const handleCorrectHistory = async (
    record,
    newAction
  ) => {
    if (record.action === newAction) {
      return;
    }

    const confirmed = window.confirm(
      `Change ${record.name}'s record from ${record.action} to ${newAction}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const params = new URLSearchParams({
        action: newAction,
      });

      const response = await fetch(
        `${API_URL}/admin/history/${record.id}?${params.toString()}`,
        {
          method: "PATCH",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to correct history."
        );
      }

      showMessage(
        `History updated for ${record.name}.`
      );

      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to correct history."
      );
    }
  };

  // =========================================================
  // DELETE HISTORY
  // =========================================================

  const handleDeleteHistory = async (record) => {
    const confirmed = window.confirm(
      `Delete this history record for ${record.name}?\n\nAction: ${record.action}\nTime: ${formatDate(record.timestamp)}`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/admin/history/${record.id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        navigate("/");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to delete history."
        );
      }

      showMessage(
        "History record deleted successfully."
      );

      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to delete history."
      );
    }
  };

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-icon">💧</div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  // =========================================================
  // ERROR SCREEN
  // =========================================================

  if (error && !summary) {
    return (
      <div className="admin-loading">
        <div className="admin-error-box">
          <div className="admin-error-icon">
            ⚠️
          </div>

          <h2>Unable to load dashboard</h2>

          <p>{error}</p>

          <button
            className="admin-retry-button"
            onClick={fetchAdminData}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // ADMIN DASHBOARD
  // =========================================================

  return (
    <div className="admin-page">

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <nav className="admin-navbar">

        <div className="admin-brand">

          <div className="admin-brand-icon">
            💧
          </div>

          <div>
            <strong>
              Water Can Tracker
            </strong>

            <span>
              Administration
            </span>
          </div>

        </div>

        <div className="admin-user-section">

          <div className="admin-user-info">

            <strong>
              {localStorage.getItem("user_name") ||
                "Administrator"}
            </strong>

            <span>
              Administrator
            </span>

          </div>

          <button
            className="admin-logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="admin-content">

        {/* PAGE HEADER */}

        <section className="admin-welcome">

          <div>

            <p className="admin-small-heading">
              ADMIN PANEL
            </p>

            <h1>
              Dashboard Overview
            </h1>

            <p>
              Manage members and monitor the
              water-can rotation.
            </p>

          </div>

          <button
            className="admin-add-member-button"
            onClick={() =>
              setShowAddMember(!showAddMember)
            }
          >
            {showAddMember
              ? "✕ Close"
              : "＋ Add Member"}
          </button>

        </section>


        {/* ACTION MESSAGE */}

        {actionMessage && (
          <div className="admin-success-message">
            <span>✓</span>
            {actionMessage}
          </div>
        )}


        {/* ERROR MESSAGE */}

        {error && (
          <div className="admin-dashboard-error">
            <span>⚠️</span>
            {error}
          </div>
        )}


        {/* =================================================
            ADD MEMBER FORM
        ================================================== */}

        {showAddMember && (
          <section className="admin-add-member-card">

            <div className="admin-add-member-header">

              <div>

                <span className="admin-section-label">
                  NEW MEMBER
                </span>

                <h2>
                  Add House Member
                </h2>

              </div>

              <button
                className="admin-close-form"
                onClick={() =>
                  setShowAddMember(false)
                }
              >
                ✕
              </button>

            </div>

            <form
              className="admin-add-member-form"
              onSubmit={handleAddMember}
            >

              <div className="admin-form-group">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter full name"
                  value={newMember.name}
                  onChange={handleNewMemberChange}
                  disabled={addingMember}
                />

              </div>


              <div className="admin-form-group">

                <label>
                  Username
                </label>

                <input
                  type="text"
                  name="username"
                  placeholder="Enter username"
                  value={newMember.username}
                  onChange={handleNewMemberChange}
                  disabled={addingMember}
                />

              </div>


              <div className="admin-form-group">

                <label>
                  Default Password
                </label>

                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={newMember.password}
                  onChange={handleNewMemberChange}
                  disabled={addingMember}
                />

              </div>


              <div className="admin-form-group">

                <label>
                  Turn Order
                </label>

                <input
                  type="number"
                  name="turn_order"
                  min="1"
                  placeholder="Example: 5"
                  value={newMember.turn_order}
                  onChange={handleNewMemberChange}
                  disabled={addingMember}
                />

              </div>


              <button
                type="submit"
                className="admin-create-button"
                disabled={addingMember}
              >
                {addingMember
                  ? "Creating..."
                  : "Create Member"}
              </button>

            </form>

            <p className="admin-form-note">
              The member will be required to change
              this password after their first login.
            </p>

          </section>
        )}


        {/* =================================================
            SUMMARY CARDS
        ================================================== */}

        <section className="admin-stats-grid">

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              👥
            </div>

            <div>
              <span>
                Total Members
              </span>

              <strong>
                {summary?.total_users ?? 0}
              </strong>
            </div>

          </div>


          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              💧
            </div>

            <div>
              <span>
                Total Filled
              </span>

              <strong>
                {summary?.total_filled ?? 0}
              </strong>
            </div>

          </div>


          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              🚫
            </div>

            <div>
              <span>
                Total Absent
              </span>

              <strong>
                {summary?.total_absent ?? 0}
              </strong>
            </div>

          </div>


          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              📊
            </div>

            <div>
              <span>
                Total Records
              </span>

              <strong>
                {summary?.total_records ?? 0}
              </strong>
            </div>

          </div>

        </section>


        {/* =================================================
            CURRENT TURN
        ================================================== */}

        <section className="admin-current-turn-card">

          <div className="admin-current-turn-top">

            <div>

              <span className="admin-section-label">
                CURRENT WATER CAN TURN
              </span>

              <h2>
                {summary?.current_turn?.name ||
                  "No current turn"}
              </h2>

              {summary?.current_turn && (
                <p>
                  @{summary.current_turn.username}
                </p>
              )}

            </div>

            <div className="admin-live-badge">

              <span className="admin-live-dot"></span>

              LIVE

            </div>

          </div>

          {summary?.current_turn && (
            <div className="admin-turn-position">
              Turn position #
              {summary.current_turn.turn_order}
            </div>
          )}

        </section>


        {/* =================================================
            MEMBERS
        ================================================== */}

        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <span className="admin-section-label">
                MEMBERS
              </span>

              <h2>
                House Members
              </h2>

            </div>

            <span className="admin-count-badge">
              {users.filter(
                (user) => user.role !== "admin"
              ).length}{" "}
              members
            </span>

          </div>


          <div className="admin-members-card">

            {users.filter(
              (user) => user.role !== "admin"
            ).length === 0 ? (

              <div className="admin-empty">
                No members found.
              </div>

            ) : (

              users
                .filter(
                  (user) => user.role !== "admin"
                )
                .map((user) => {

                  const isCurrentTurn =
                    summary?.current_turn?.id ===
                    user.id;

                  return (

                    <div
                      className={`admin-member-row ${
                        isCurrentTurn
                          ? "admin-current-member"
                          : ""
                      }`}
                      key={user.id}
                    >

                      <div className="admin-member-number">
                        {user.turn_order}
                      </div>


                      <div className="admin-member-avatar">
                        {getInitials(user.name)}
                      </div>


                      <div className="admin-member-details">

                        <strong>
                          {user.name}
                        </strong>

                        <span>
                          @{user.username}
                        </span>

                      </div>


                      <div className="admin-member-stats">

                        <span className="admin-filled-count">
                          ✓ {user.filled}
                        </span>

                        <span className="admin-absent-count">
                          ✕ {user.absent}
                        </span>

                      </div>


                      <div
                        className={`admin-status ${
                          user.is_active
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {user.is_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </div>


                      {isCurrentTurn && (
                        <div className="admin-turn-badge">
                          CURRENT
                        </div>
                      )}


                      {/* MEMBER ACTIONS */}

                      <div className="admin-member-actions">

                        {!isCurrentTurn &&
                          user.is_active && (
                            <button
                              className="admin-action-button turn"
                              onClick={() =>
                                handleChangeTurn(user)
                              }
                              title="Make current turn"
                            >
                              ↻ Turn
                            </button>
                          )}


                        <button
                          className="admin-action-button password"
                          onClick={() =>
                            handleResetPassword(user)
                          }
                          title="Reset password"
                        >
                          🔑 Reset
                        </button>


                        <button
                          className={`admin-action-button ${
                            user.is_active
                              ? "deactivate"
                              : "activate"
                          }`}
                          onClick={() =>
                            handleToggleStatus(user)
                          }
                          title={
                            user.is_active
                              ? "Deactivate member"
                              : "Activate member"
                          }
                        >
                          {user.is_active
                            ? "Disable"
                            : "Enable"}
                        </button>

                      </div>

                    </div>

                  );
                })

            )}

          </div>

        </section>


        {/* =================================================
            HISTORY
        ================================================== */}

        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <span className="admin-section-label">
                ACTIVITY
              </span>

              <h2>
                Complete History
              </h2>

            </div>

            <span className="admin-count-badge">
              {history.length} records
            </span>

          </div>


          <div className="admin-history-card">

            {history.length === 0 ? (

              <div className="admin-empty">
                No history recorded yet.
              </div>

            ) : (

              <div className="admin-history-list">

                {history.map((record) => (

                  <div
                    className="admin-history-row"
                    key={record.id}
                  >

                    <div className="admin-history-person">

                      <div className="admin-history-avatar">
                        {getInitials(record.name)}
                      </div>

                      <div>

                        <strong>
                          {record.name}
                        </strong>

                        <span>
                          @{record.username}
                        </span>

                      </div>

                    </div>


                    <div
                      className={
                        record.action === "FILLED"
                          ? "admin-history-filled"
                          : "admin-history-absent"
                      }
                    >
                      {record.action === "FILLED"
                        ? "✓ FILLED"
                        : "✕ ABSENT"}
                    </div>


                    <div className="admin-history-time">
                      {formatDate(record.timestamp)}
                    </div>


                    {/* HISTORY CONTROLS */}

                    <div className="admin-history-actions">

                      <button
                        className="admin-history-correct filled"
                        onClick={() =>
                          handleCorrectHistory(
                            record,
                            "FILLED"
                          )
                        }
                        disabled={
                          record.action === "FILLED"
                        }
                        title="Mark as filled"
                      >
                        ✓
                      </button>


                      <button
                        className="admin-history-correct absent"
                        onClick={() =>
                          handleCorrectHistory(
                            record,
                            "ABSENT"
                          )
                        }
                        disabled={
                          record.action === "ABSENT"
                        }
                        title="Mark as absent"
                      >
                        ✕
                      </button>


                      <button
                        className="admin-history-delete"
                        onClick={() =>
                          handleDeleteHistory(record)
                        }
                        title="Delete history"
                      >
                        🗑
                      </button>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </section>

      </main>


      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="admin-footer">
        Water Can Tracker • Admin Panel
      </footer>

    </div>
  );
}

export default AdminDashboard;