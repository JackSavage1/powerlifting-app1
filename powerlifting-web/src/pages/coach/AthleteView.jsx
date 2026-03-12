import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function AthleteView() {
  const { athleteId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [prs, setPRs] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [tab, setTab] = useState('sessions');
  const [loading, setLoading] = useState(true);

  // Assign form
  const [assignProgramId, setAssignProgramId] = useState('');
  const [assignStart, setAssignStart] = useState(new Date().toISOString().slice(0, 10));
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [a, s, p, progs] = await Promise.all([
          api.getUser(athleteId),
          api.getAthleteSessions(user.id, athleteId),
          api.getPRs(athleteId),
          api.getPrograms(),
        ]);
        setAthlete(a);
        setSessions(s.items);
        setPRs(p.items);
        setPrograms(progs.items.filter(pr => pr.status === 'active'));
        const asgn = await api.getActiveAssignment(athleteId).catch(() => null);
        setActiveAssignment(asgn);
        if (progs.items.filter(pr => pr.status === 'active').length > 0) {
          setAssignProgramId(progs.items.find(pr => pr.status === 'active')?._id ?? '');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [athleteId, user.id]);

  const assign = async (e) => {
    e.preventDefault();
    if (!assignProgramId) return;
    setAssigning(true);
    try {
      await api.assignProgram(assignProgramId, { athleteId, startDate: assignStart });
      const asgn = await api.getActiveAssignment(athleteId).catch(() => null);
      setActiveAssignment(asgn);
    } catch (err) {
      alert(err.message);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <button className="btn-ghost" onClick={() => navigate('/roster')}>← Roster</button>
      <h2>{athlete?.profile?.displayName ?? athlete?.email}</h2>
      <p className="muted">{athlete?.email} · {athlete?.profile?.weightClass ?? 'no weight class'}</p>

      <div className="tabs">
        <button className={tab === 'sessions' ? 'active' : ''} onClick={() => setTab('sessions')}>Sessions ({sessions.length})</button>
        <button className={tab === 'prs' ? 'active' : ''} onClick={() => setTab('prs')}>PRs ({prs.length})</button>
        <button className={tab === 'program' ? 'active' : ''} onClick={() => setTab('program')}>Program</button>
      </div>

      {tab === 'sessions' && (
        <div className="session-list">
          {sessions.length === 0 && <p className="muted">No sessions yet.</p>}
          {sessions.map((s) => (
            <div key={s._id} className="session-row">
              <div className="session-date">{s.date}</div>
              <div className="session-meta">
                {s.exerciseCount} exercise{s.exerciseCount !== 1 ? 's' : ''}
                {s.linkedToProgram && <span className="badge active" style={{marginLeft:'0.4rem'}}>program</span>}
              </div>
              <span className={`badge ${s.status}`}>{s.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'prs' && (
        <div className="pr-list">
          {prs.length === 0 && <p className="muted">No PRs marked.</p>}
          {prs.map((pr) => (
            <div key={pr.exerciseId} className="pr-row">
              <div className="pr-name">{pr.exercise?.name ?? pr.exerciseId}</div>
              <div>
                <span className="pr-weight">{pr.weightLbs} lbs</span>
                <span className="muted"> × {pr.reps}</span>
              </div>
              <span className="muted small">{pr.achievedAt?.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'program' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeAssignment ? (
            <div className="card">
              <h3>Current program</h3>
              <p><strong>{activeAssignment.program?.name ?? 'Unknown'}</strong></p>
              <p className="muted small">Started {activeAssignment.startDate}</p>
              <p className="muted small">
                Week {activeAssignment.currentWeek} · Day {activeAssignment.currentDay}
              </p>
            </div>
          ) : (
            <p className="muted">No active program assigned.</p>
          )}

          <div className="card">
            <h3>Assign a program</h3>
            {programs.length === 0 ? (
              <p className="muted">No published programs yet. <button className="btn-ghost" onClick={() => navigate('/programs')}>Create one →</button></p>
            ) : (
              <form onSubmit={assign} className="form">
                <label>Program
                  <select value={assignProgramId} onChange={e => setAssignProgramId(e.target.value)} required>
                    <option value="">Select…</option>
                    {programs.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.durationWeeks}wk)</option>
                    ))}
                  </select>
                </label>
                <label>Start date
                  <input type="date" value={assignStart} onChange={e => setAssignStart(e.target.value)} required />
                </label>
                <button className="btn-primary" type="submit" disabled={assigning}>
                  {assigning ? 'Assigning…' : 'Assign program'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
