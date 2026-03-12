import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Today() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [program, setProgram] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [bw, setBw] = useState('');

  const loadInvitations = async () => {
    const { items } = await api.getInvitations(user.id).catch(() => ({ items: [] }));
    setInvitations(items.filter(i => i.status === 'pending'));
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [{ items }, p] = await Promise.all([
          api.getSessions(user.id, 5),
          api.getActiveAssignment(user.id).catch(() => null),
        ]);
        const today = items.find((s) => s.date === todayStr());
        if (today) setSession(today);
        setProgram(p);
        await loadInvitations();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  const respondInvite = async (invId, action) => {
    await api.respondInvite(invId, action);
    await loadInvitations();
  };

  const startSession = async () => {
    setStarting(true);
    try {
      const payload = { date: todayStr() };
      if (bw) payload.bodyweightLbs = parseFloat(bw);
      if (program?.currentDayId) {
        payload.assignmentId = program.assignment._id;
        payload.programDayId = program.currentDayId;
      }
      const s = await api.createSession(payload);
      navigate(`/sessions/${s._id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  const currentDay = program?.days?.find((d) => d._id === program.currentDayId);

  return (
    <div className="page">
      <h2>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>

      {invitations.length > 0 && (
        <div className="card">
          <h3>Coach invitations</h3>
          {invitations.map(inv => (
            <div key={inv._id} className="invite-row">
              <span>Your coach wants to add you to their roster.</span>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn-primary btn-sm" onClick={() => respondInvite(inv._id, 'accept')}>Accept</button>
                <button className="btn-danger-sm" onClick={() => respondInvite(inv._id, 'decline')}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {session ? (
        <div className="card">
          <div className="card-header">
            <span>Today's session</span>
            <span className={`badge ${session.status}`}>{session.status}</span>
          </div>
          <p>{session.exerciseCount} exercise{session.exerciseCount !== 1 ? 's' : ''} logged</p>
          <button className="btn-primary" onClick={() => navigate(`/sessions/${session._id}`)}>
            {session.status === 'open' ? 'Continue session →' : 'View session →'}
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header"><span>Start today's session</span></div>
          {program && currentDay ? (
            <div className="program-today">
              <p className="label">Today's program</p>
              <p><strong>{program.program.name}</strong> — Week {currentDay.weekNumber}, Day {currentDay.dayNumber}</p>
              {currentDay.slots?.length > 0 && (
                <ul className="slot-list">
                  {currentDay.slots.map((s, i) => (
                    <li key={i}>{s.targetSets}×{s.targetReps}{s.targetWeightLbs ? ` @ ${s.targetWeightLbs} lbs` : ''}{s.targetRPE ? ` RPE ${s.targetRPE}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="muted">No program assigned — freestyle session</p>
          )}
          <label className="bw-input">
            Bodyweight (optional, lbs)
            <input type="number" step="0.5" min="0" placeholder="e.g. 185" value={bw} onChange={e => setBw(e.target.value)} />
          </label>
          <button className="btn-primary" onClick={startSession} disabled={starting}>
            {starting ? 'Starting…' : 'Start session'}
          </button>
        </div>
      )}

      {!program && (
        <p className="muted small">Ask your coach to assign you a program, or log freestyle sessions.</p>
      )}
    </div>
  );
}
