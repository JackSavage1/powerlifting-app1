import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSessions(user.id, 50).then(({ items }) => setSessions(items)).finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <h2>Session History</h2>
      {sessions.length === 0 ? (
        <p className="muted">No sessions yet. <a onClick={() => navigate('/today')} style={{cursor:'pointer',color:'var(--accent)'}}>Start one →</a></p>
      ) : (
        <div className="session-list">
          {sessions.map((s) => (
            <div key={s._id} className="session-row" onClick={() => navigate(`/sessions/${s._id}`)} style={{cursor:'pointer'}}>
              <div className="session-date">{s.date}</div>
              <div className="session-meta">
                {s.exerciseCount} exercise{s.exerciseCount !== 1 ? 's' : ''}
                {s.linkedToProgram && <span className="badge program">program</span>}
              </div>
              <div>
                <span className={`badge ${s.status}`}>{s.status}</span>
                {s.bodyweightLbs && <span className="muted small"> · {s.bodyweightLbs} lbs</span>}
              </div>
              <span className="chevron">›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
