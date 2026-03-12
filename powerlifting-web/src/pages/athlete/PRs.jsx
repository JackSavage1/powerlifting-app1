import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function PRs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prs, setPRs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPRs(user.id).then(({ items }) => setPRs(items)).finally(() => setLoading(false));
  }, [user.id]);

  const unmark = async (exerciseId, exerciseName) => {
    if (!confirm(`Remove PR for ${exerciseName}?`)) return;
    await api.deletePR(user.id, exerciseId);
    setPRs((prev) => prev.filter((p) => p.exerciseId !== exerciseId));
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <h2>Personal Records</h2>
      {prs.length === 0 ? (
        <p className="muted">No PRs marked yet. After closing a session, you can flag any set as a PR from the session detail.</p>
      ) : (
        <div className="pr-list">
          {prs.map((pr) => (
            <div key={pr.exerciseId} className="pr-row">
              <div className="pr-exercise">{pr.exercise?.name ?? pr.exerciseId}</div>
              <div className="pr-lift">
                <span className="pr-weight">{pr.weightLbs} lbs</span>
                <span className="pr-reps">× {pr.reps}</span>
              </div>
              <div className="pr-meta">
                <span className="muted small">{pr.achievedAt}</span>
                <button className="btn-ghost-sm" onClick={() => navigate(`/session/${pr.sessionId}`)}>View →</button>
                <button className="btn-danger-sm" onClick={() => unmark(pr.exerciseId, pr.exercise?.name)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
