import { Link, useLocation, useNavigate } from "react-router-dom";

export function PageShell({
  title,
  actions,
  children
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const showBackButton = location.pathname !== "/";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-side header-side-left">
          {showBackButton ? (
            <button className="button header-back" onClick={() => navigate("/")} aria-label="Go to home">
              <span aria-hidden="true" className="header-back-icon">
                ←
              </span>
              <span>Back</span>
            </button>
          ) : null}
        </div>
        <h1 className="header-title">{title}</h1>
        <div className="header-actions header-side-right">{actions}</div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="empty-state">
      <p>No habits yet.</p>
      <Link to="/habit/new" className="button primary">
        Create your first habit
      </Link>
    </div>
  );
}
