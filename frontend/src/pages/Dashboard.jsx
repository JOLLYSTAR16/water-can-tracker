import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");
  const username = localStorage.getItem("username");
  const userName = localStorage.getItem("user_name");

  // =========================================================
  // FETCH DASHBOARD DATA
  // =========================================================

  const fetchStatus = async () => {
    if (!token) {
      navigate("/");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/water-can/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        navigate("/");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Unable to load dashboard"
        );
      }

      setData(result);
      setError("");
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(
        err.message ||
          "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD + AUTO REFRESH
  // =========================================================

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    fetchStatus();

    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // =========================================================
  // WATER CAN ACTION
  // =========================================================

  const handleAction = async (action) => {
    if (!data || actionLoading) {
      return;
    }

    const currentTurn =
      data.current_turn;

    const isMyTurn =
      currentTurn?.username === username;

    if (!isMyTurn) {
      setError(
        `It is currently ${currentTurn?.name}'s turn.`
      );
      return;
    }

    if (action === "ABSENT") {
      const confirmed = window.confirm(
        "Are you sure you want to mark yourself absent?\n\nYour turn will be skipped and the next member will get the turn."
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/water-can/action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
          }),
        }
      );

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        setError(
          result.detail ||
            "You are not allowed to perform this action."
        );
        await fetchStatus();
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.detail ||
            "Unable to complete the action."
        );
      }

      await fetchStatus();
    } catch (err) {
      console.error("Action error:", err);
      setError(
        err.message ||
          "Unable to complete the action."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // HELPERS
  // =========================================================

  const getInitials = (name) => {
    if (!name) return "?";

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0][0].toUpperCase();
    }

    return (
      words[0][0] +
      words[words.length - 1][0]
    ).toUpperCase();
  };

  // Display all history timestamps in IST (Mumbai / Asia-Kolkata)
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-icon">💧</div>
        <h2>Water Can Tracker</h2>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // =========================================================
  // DASHBOARD
  // =========================================================

  const currentTurn = data?.current_turn;
  const isMyTurn =
    currentTurn?.username === username;

  const myStats =
    data?.stats?.find(
      (member) =>
        member.username === username
    ) || {
      filled: 0,
      absent: 0,
    };

  const totalFilled =
    data?.stats?.reduce(
      (total, member) =>
        total + (member.filled || 0),
      0
    ) || 0;

  const totalAbsent =
    data?.stats?.reduce(
      (total, member) =>
        total + (member.absent || 0),
      0
    ) || 0;

  const members =
    data?.stats || [];

  const history =
    data?.history || [];

  return (
    <div className="dashboard-page">

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <nav className="dashboard-navbar">

        <div className="dashboard-brand">

          <div className="dashboard-brand-icon">
            💧
          </div>

          <div className="dashboard-brand-text">
            <strong>
              Water Can Tracker
            </strong>

            <span>
              Shared household rotation
            </span>
          </div>

        </div>

        <div className="dashboard-user-area">

          <div className="dashboard-user-info">

            <strong>
              {userName || username}
            </strong>

            <span>
              Member
            </span>

          </div>

          <button
            className="dashboard-logout"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="dashboard-content">

        {/* ===================================================
            HEADER
        ==================================================== */}

        <section className="dashboard-welcome">

          <div>

            <p className="dashboard-eyebrow">
              WATER CAN TRACKER
            </p>

            <h1>
              Hello, {userName || username}
            </h1>

            <p>
              Keep the turn fair and simple.
            </p>

          </div>

        </section>


        {/* ===================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="dashboard-error">
            <span>⚠️</span>
            <p>{error}</p>

            <button
              onClick={() => {
                setError("");
                fetchStatus();
              }}
            >
              Retry
            </button>
          </div>
        )}


        {/* ===================================================
            CURRENT TURN CARD
        ==================================================== */}

        <section
          className={`current-turn-card ${
            isMyTurn
              ? "my-current-turn"
              : ""
          }`}
        >

          <div className="current-turn-main">

            <div className="current-turn-label-row">

              <span className="section-label">
                CURRENT TURN
              </span>

              <span className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </span>

            </div>

            <h2>
              {currentTurn?.name ||
                "No current turn"}
            </h2>

            {currentTurn && (
              <p className="current-turn-description">

                {isMyTurn
                  ? "It is your turn to fill the water can."
                  : `${currentTurn.name} is currently responsible for the water can.`}

              </p>
            )}

            {isMyTurn && (
              <div className="your-turn-message">
                <span>💧</span>
                <strong>
                  Your turn — take action when the can is empty.
                </strong>
              </div>
            )}

            {!isMyTurn && currentTurn && (
              <div className="waiting-message">
                <span>⌛</span>
                <span>
                  Waiting for{" "}
                  <strong>
                    {currentTurn.name}
                  </strong>
                </span>
              </div>
            )}

          </div>

          <div className="turn-number">
            {String(
              currentTurn?.turn_order || 0
            ).padStart(2, "0")}
          </div>

        </section>


        {/* ===================================================
            ACTIONS
        ==================================================== */}

        {isMyTurn && (
          <section className="action-card">

            <div className="action-card-header">

              <div>

                <span className="section-label">
                  YOUR TURN
                </span>

                <h2>
                  What happened?
                </h2>

              </div>

              <div className="action-status">
                <span className="status-dot"></span>
                Ready
              </div>

            </div>


            <div className="action-buttons">

              <button
                className="action-button filled-button"
                onClick={() =>
                  handleAction("FILLED")
                }
                disabled={actionLoading}
              >

                <span className="action-icon">
                  💧
                </span>

                <span className="action-text">

                  <strong>
                    Can Filled
                  </strong>

                  <small>
                    Mark your turn as completed
                  </small>

                </span>

                <span className="action-arrow">
                  →
                </span>

              </button>


              <button
                className="action-button absent-button"
                onClick={() =>
                  handleAction("ABSENT")
                }
                disabled={actionLoading}
              >

                <span className="action-icon">
                  🚫
                </span>

                <span className="action-text">

                  <strong>
                    I'm Absent
                  </strong>

                  <small>
                    Skip my turn for now
                  </small>

                </span>

                <span className="action-arrow">
                  →
                </span>

              </button>

            </div>

            {actionLoading && (
              <div className="action-loading">
                Updating water-can turn...
              </div>
            )}

          </section>
        )}


        {/* ===================================================
            QUICK STATS
        ==================================================== */}

        <section className="quick-stats">

          <div className="quick-stat-card">

            <div className="quick-stat-icon">
              💧
            </div>

            <div className="quick-stat-content">

              <span>
                Total Turns
              </span>

              <strong>
                {data?.total_turns || 0}
              </strong>

            </div>

          </div>


          <div className="quick-stat-card">

            <div className="quick-stat-icon absent-icon">
              🚫
            </div>

            <div className="quick-stat-content">

              <span>
                My Absences
              </span>

              <strong>
                {myStats.absent}
              </strong>

            </div>

          </div>


          <div className="quick-stat-card">

            <div className="quick-stat-icon completed-icon">
              🏆
            </div>

            <div className="quick-stat-content">

              <span>
                My Completed
              </span>

              <strong>
                {myStats.filled}
              </strong>

            </div>

          </div>

        </section>


        {/* ===================================================
            TURN ORDER
        ==================================================== */}

        <section className="dashboard-section">

          <div className="section-header">

            <div>

              <span className="section-label">
                ROTATION
              </span>

              <h2>
                Turn Order
              </h2>

            </div>

            <span className="rotation-badge">
              Alphabetical
            </span>

          </div>


          <div className="turn-order-list">

            {members.map((member, index) => {

              const current =
                currentTurn?.username ===
                member.username;

              return (
                <div
                  key={member.username}
                  className={`turn-order-row ${
                    current
                      ? "turn-order-current"
                      : ""
                  } ${
                    !current &&
                    member.username === username
                      ? "turn-order-me"
                      : ""
                  }`}
                >

                  <span className="turn-order-number">
                    {String(
                      member.turn_order ||
                        index + 1
                    ).padStart(2, "0")}
                  </span>

                  <div className="turn-order-avatar">
                    {getInitials(
                      member.name
                    )}
                  </div>

                  <div className="turn-order-name">

                    <strong>
                      {member.name}
                    </strong>

                    {member.username ===
                      username && (
                      <span>
                        You
                      </span>
                    )}

                  </div>

                  {current && (
                    <span className="current-badge">
                      CURRENT
                    </span>
                  )}

                </div>
              );
            })}

          </div>

        </section>


        {/* ===================================================
            MEMBER STATISTICS
        ==================================================== */}

        <section className="dashboard-section">

          <div className="section-header">

            <div>

              <span className="section-label">
                OVERVIEW
              </span>

              <h2>
                Member Statistics
              </h2>

            </div>

            <div className="statistics-total">
              {totalFilled + totalAbsent} records
            </div>

          </div>


          <div className="member-statistics-grid">

            {members.map((member) => {

              const isCurrent =
                currentTurn?.username ===
                member.username;

              const total =
                (member.filled || 0) +
                (member.absent || 0);

              return (
                <div
                  className={`member-stat-card ${
                    member.username ===
                    username
                      ? "my-stat-card"
                      : ""
                  }`}
                  key={member.username}
                >

                  <div className="member-stat-top">

                    <div className="member-stat-person">

                      <div className="member-stat-avatar">
                        {getInitials(
                          member.name
                        )}
                      </div>

                      <div>

                        <strong>
                          {member.name}
                        </strong>

                        <span>
                          {member.username ===
                          username
                            ? "You"
                            : `@${member.username}`}
                        </span>

                      </div>

                    </div>

                    {isCurrent && (
                      <span className="stat-current">
                        TURN
                      </span>
                    )}

                  </div>


                  <div className="member-stat-values">

                    <div className="stat-value filled-stat">

                      <span className="stat-value-icon">
                        ✓
                      </span>

                      <div>
                        <strong>
                          {member.filled || 0}
                        </strong>

                        <span>
                          Filled
                        </span>
                      </div>

                    </div>


                    <div className="stat-value absent-stat">

                      <span className="stat-value-icon">
                        ✕
                      </span>

                      <div>
                        <strong>
                          {member.absent || 0}
                        </strong>

                        <span>
                          Absent
                        </span>
                      </div>

                    </div>


                    <div className="stat-value total-stat">

                      <span className="stat-value-icon">
                        #
                      </span>

                      <div>
                        <strong>
                          {total}
                        </strong>

                        <span>
                          Total
                        </span>
                      </div>

                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        </section>


        {/* ===================================================
            RECENT HISTORY
        ==================================================== */}

        <section className="dashboard-section">

          <div className="section-header">

            <div>

              <span className="section-label">
                ACTIVITY
              </span>

              <h2>
                Recent History
              </h2>

            </div>

            <span className="history-count">
              {history.length} records
            </span>

          </div>


          <div className="history-card">

            {history.length === 0 ? (

              <div className="empty-history">
                <div>
                  💧
                </div>

                <h3>
                  No history yet
                </h3>

                <p>
                  Water-can activity will appear here.
                </p>

              </div>

            ) : (

              <div className="history-list">

                {history.map((record) => (

                  <div
                    className="history-row"
                    key={record.id}
                  >

                    <div className="history-person">

                      <div className="history-avatar">
                        {getInitials(
                          record.name
                        )}
                      </div>

                      <div className="history-person-details">

                        <strong>
                          {record.name}
                        </strong>

                        <span>
                          @{record.username}
                        </span>

                      </div>

                    </div>


                    <div
                      className={`history-action ${
                        record.action ===
                        "FILLED"
                          ? "history-filled"
                          : "history-absent"
                      }`}
                    >

                      <span>
                        {record.action ===
                        "FILLED"
                          ? "✓"
                          : "✕"}
                      </span>

                      {record.action}

                    </div>


                    <div className="history-time">
                      {formatDate(
                        record.timestamp
                      )}
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

      <footer className="dashboard-footer">

        <span>💧</span>

        Water Can Tracker

        <span className="footer-separator">
          •
        </span>

        Shared household management

      </footer>

    </div>
  );
}

export default Dashboard;