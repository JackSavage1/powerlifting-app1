import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function Programs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', durationWeeks: 4, daysPerWeek: 3 });

  const load = () => api.getPrograms().then(({ items }) => setPrograms(items)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const p = await api.createProgram({
        name: form.name,
        description: form.description || undefined,
        durationWeeks: parseInt(form.durationWeeks),
        daysPerWeek: parseInt(form.daysPerWeek),
      });
      navigate(`/programs/${p._id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteProgram = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.deleteProgram(id).catch(err => alert(err.message));
    load();
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <h2>Programs</h2>

      {programs.length === 0 ? (
        <p className="muted">No programs yet.</p>
      ) : (
        <div className="program-list">
          {programs.map((p) => (
            <div key={p._id} className="program-row">
              <div>
                <div className="program-name">{p.name}</div>
                <div className="muted small">{p.durationWeeks}wk · {p.daysPerWeek}×/wk · <span className={`badge ${p.status}`}>{p.status}</span></div>
              </div>
              <div className="program-actions">
                <button className="btn-secondary" onClick={() => navigate(`/programs/${p._id}`)}>Edit →</button>
                <button className="btn-danger-sm" onClick={() => deleteProgram(p._id, p.name)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>New program</h3>
        <form onSubmit={create} className="form">
          <label>Name
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="12-Week Peaking Block" />
          </label>
          <label>Description
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
          </label>
          <div className="form-row">
            <label>Weeks
              <input type="number" min="1" value={form.durationWeeks} onChange={e => setForm(f => ({ ...f, durationWeeks: e.target.value }))} />
            </label>
            <label>Days/week
              <input type="number" min="1" max="7" value={form.daysPerWeek} onChange={e => setForm(f => ({ ...f, daysPerWeek: e.target.value }))} />
            </label>
          </div>
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create program'}
          </button>
        </form>
      </div>
    </div>
  );
}
