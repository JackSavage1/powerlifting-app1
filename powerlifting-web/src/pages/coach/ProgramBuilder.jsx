import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function ProgramBuilder() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [days, setDays] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [dayForm, setDayForm] = useState({ weekNumber: 1, dayNumber: 1, label: '' });

  const load = async () => {
    const [pRes, dRes, eRes] = await Promise.all([
      api.getProgram(programId),
      api.getProgramDays(programId),
      api.getExercises(),
    ]);
    setProgram(pRes);
    setDays(dRes.items);
    setExercises(eRes.items);
    setLoading(false);
  };

  useEffect(() => { load(); }, [programId]);

  const publish = async () => {
    setSaving(true);
    try {
      await api.updateProgram(programId, { status: 'active' });
      setProgram(p => ({ ...p, status: 'active' }));
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addDay = async (e) => {
    e.preventDefault();
    setAddingDay(true);
    try {
      await api.createDay(programId, {
        weekNumber: parseInt(dayForm.weekNumber),
        dayNumber: parseInt(dayForm.dayNumber),
        label: dayForm.label || undefined,
      });
      await load();
      setDayForm({ weekNumber: 1, dayNumber: 1, label: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingDay(false);
    }
  };

  const updateDayExercises = async (dayId, slots) => {
    try {
      await api.updateDay(programId, dayId, { slots });
      setDays(ds => ds.map(d => d._id === dayId ? { ...d, slots } : d));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!program) return null;

  // Group days by week
  const byWeek = {};
  for (const d of days) {
    const w = d.weekNumber;
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(d);
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate('/programs')}>← Programs</button>
        <h2>{program.name}</h2>
        <span className={`badge ${program.status}`}>{program.status}</span>
      </div>
      <p className="muted">{program.durationWeeks} weeks · {program.daysPerWeek} days/week</p>

      {program.status === 'draft' && (
        <button className="btn-primary" onClick={publish} disabled={saving} style={{ marginBottom: '1.5rem' }}>
          {saving ? 'Publishing…' : 'Publish program'}
        </button>
      )}

      {Object.keys(byWeek).sort((a, b) => a - b).map(week => (
        <div key={week} className="week-block">
          <h3 className="week-heading">Week {week}</h3>
          {byWeek[week].sort((a, b) => a.dayNumber - b.dayNumber).map(day => (
            <DayCard
              key={day._id}
              day={day}
              exercises={exercises}
              onSave={(slots) => updateDayExercises(day._id, slots)}
            />
          ))}
        </div>
      ))}

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>Add day</h3>
        <form onSubmit={addDay} className="form">
          <div className="form-row">
            <label>Week
              <input type="number" min="1" max={program.durationWeeks} value={dayForm.weekNumber}
                onChange={e => setDayForm(f => ({ ...f, weekNumber: e.target.value }))} />
            </label>
            <label>Day
              <input type="number" min="1" max={program.daysPerWeek} value={dayForm.dayNumber}
                onChange={e => setDayForm(f => ({ ...f, dayNumber: e.target.value }))} />
            </label>
          </div>
          <label>Label (optional)
            <input value={dayForm.label} placeholder="e.g. Squat day"
              onChange={e => setDayForm(f => ({ ...f, label: e.target.value }))} />
          </label>
          <button className="btn-primary" type="submit" disabled={addingDay}>
            {addingDay ? 'Adding…' : 'Add day'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DayCard({ day, exercises, onSave }) {
  const [slots, setSlots] = useState(day.slots || []);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ exerciseId: '', sets: 3, reps: 5 });

  const addSlot = () => {
    if (!form.exerciseId) return;
    const ex = exercises.find(e => e._id === form.exerciseId);
    const newSlots = [...slots, {
      exerciseId: form.exerciseId,
      exerciseName: ex?.name || '',
      sets: parseInt(form.sets),
      reps: parseInt(form.reps),
    }];
    setSlots(newSlots);
    setDirty(true);
  };

  const removeSlot = (i) => {
    const newSlots = slots.filter((_, idx) => idx !== i);
    setSlots(newSlots);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    await onSave(slots);
    setDirty(false);
    setSaving(false);
  };

  return (
    <div className="day-card">
      <div className="day-header">
        <span className="day-title">Day {day.dayNumber}{day.label ? ` — ${day.label}` : ''}</span>
        {dirty && (
          <button className="btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {slots.length > 0 && (
        <table className="sets-table">
          <thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th></th></tr></thead>
          <tbody>
            {slots.map((s, i) => (
              <tr key={i}>
                <td>{s.exerciseName || s.exerciseId}</td>
                <td>{s.sets}</td>
                <td>{s.reps}</td>
                <td><button className="btn-danger-sm" onClick={() => removeSlot(i)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="slot-add-row">
        <select value={form.exerciseId} onChange={e => setForm(f => ({ ...f, exerciseId: e.target.value }))}>
          <option value="">Pick exercise…</option>
          {exercises.map(ex => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
        </select>
        <input type="number" min="1" value={form.sets} style={{ width: '4rem' }}
          onChange={e => setForm(f => ({ ...f, sets: e.target.value }))} placeholder="Sets" />
        <input type="number" min="1" value={form.reps} style={{ width: '4rem' }}
          onChange={e => setForm(f => ({ ...f, reps: e.target.value }))} placeholder="Reps" />
        <button className="btn-secondary btn-sm" onClick={addSlot}>+ Add</button>
      </div>
    </div>
  );
}
