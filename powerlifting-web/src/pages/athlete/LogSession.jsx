import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function LogSession() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [sets, setSets] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  // New set form state
  const [exerciseId, setExerciseId] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  async function reload() {
    const s = await api.getSession(sessionId);
    setSession(s);
    setSets(s.sets ?? []);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await reload();
        const { items } = await api.getExercises();
        setExercises(items);
        if (items.length) setExerciseId(items[0]._id);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const addSet = async (e) => {
    e.preventDefault();
    if (!exerciseId || !weight || !reps) return;
    setAdding(true);
    try {
      await api.createSet(sessionId, {
        exerciseId,
        weightLbs: parseFloat(weight),
        reps: parseInt(reps),
        rpe: rpe ? parseFloat(rpe) : undefined,
        notes: notes || undefined,
      });
      setWeight(''); setReps(''); setRpe(''); setNotes('');
      await reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  const deleteSet = async (setId) => {
    if (!confirm('Delete this set?')) return;
    await api.deleteSet(sessionId, setId);
    await reload();
  };

  const closeSession = async () => {
    if (!confirm('Close this session? You won\'t be able to edit sets after closing.')) return;
    setClosing(true);
    try {
      await api.updateSession(sessionId, { status: 'closed' });
      navigate('/history');
    } finally {
      setClosing(false);
    }
  };

  const exerciseName = (id) => exercises.find((e) => e._id === id)?.name ?? id;

  // Group sets by exercise for display
  const grouped = sets.reduce((acc, s) => {
    const key = s.exerciseId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!session) return <div className="page">Session not found.</div>;

  const isClosed = session.status === 'closed';

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <h2>{session.date}</h2>
        <span className={`badge ${session.status}`}>{session.status}</span>
      </div>

      {session.bodyweightLbs && (
        <p className="muted">BW: {session.bodyweightLbs} lbs</p>
      )}

      {/* Sets grouped by exercise */}
      {Object.entries(grouped).length === 0 && (
        <p className="muted">No sets logged yet.</p>
      )}
      {Object.entries(grouped).map(([exId, exSets]) => (
        <div key={exId} className="exercise-block">
          <h3>{exerciseName(exId)}</h3>
          <table className="sets-table">
            <thead>
              <tr><th>#</th><th>Weight</th><th>Reps</th><th>RPE</th><th>Notes</th>{!isClosed && <th></th>}</tr>
            </thead>
            <tbody>
              {exSets.map((s, i) => (
                <tr key={s._id}>
                  <td>{i + 1}</td>
                  <td>{s.weightLbs} lbs</td>
                  <td>{s.reps}</td>
                  <td>{s.rpe ?? '—'}</td>
                  <td>{s.notes ?? '—'}</td>
                  {!isClosed && (
                    <td><button className="btn-danger-sm" onClick={() => deleteSet(s._id)}>✕</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Add set form */}
      {!isClosed && (
        <div className="card">
          <h3>Log a set</h3>
          <form onSubmit={addSet} className="set-form">
            <label>Exercise
              <select value={exerciseId} onChange={e => setExerciseId(e.target.value)}>
                {exercises.map((ex) => (
                  <option key={ex._id} value={ex._id}>{ex.name}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>Weight (lbs)
                <input type="number" step="2.5" min="0" value={weight} onChange={e => setWeight(e.target.value)} required placeholder="225" />
              </label>
              <label>Reps
                <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} required placeholder="5" />
              </label>
              <label>RPE
                <input type="number" step="0.5" min="1" max="10" value={rpe} onChange={e => setRpe(e.target.value)} placeholder="8" />
              </label>
            </div>
            <label>Notes
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </label>
            <button className="btn-primary" type="submit" disabled={adding}>
              {adding ? 'Adding…' : '+ Add set'}
            </button>
          </form>
        </div>
      )}

      {!isClosed && (
        <button className="btn-primary" onClick={closeSession} disabled={closing}>
          {closing ? 'Closing…' : '✓ Finish session'}
        </button>
      )}
    </div>
  );
}
