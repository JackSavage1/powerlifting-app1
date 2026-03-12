import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';

export default function Roster() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.getAthletes(user.id).then(({ items }) => setAthletes(items)).finally(() => setLoading(false));

  useEffect(() => { load(); }, [user.id]);

  const invite = async (e) => {
    e.preventDefault();
    setInviting(true); setInviteMsg('');
    try {
      await api.inviteAthlete(user.id, inviteEmail);
      setInviteMsg(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      setInviteMsg(err.data?.detail ?? 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const remove = async (athleteId, name) => {
    if (!confirm(`Remove ${name} from your roster?`)) return;
    await api.removeAthlete(user.id, athleteId);
    load();
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="page">
      <h2>Your Athletes</h2>

      {athletes.length === 0 ? (
        <p className="muted">No athletes on your roster yet.</p>
      ) : (
        <div className="roster-list">
          {athletes.map(({ relationshipId, athlete }) => (
            <div key={relationshipId} className="roster-row">
              <div>
                <div className="athlete-name">{athlete.profile?.displayName ?? athlete.email}</div>
                <div className="muted small">{athlete.email}</div>
              </div>
              <div className="roster-actions">
                <button className="btn-secondary" onClick={() => navigate(`/athletes/${athlete._id}`)}>View →</button>
                <button className="btn-danger-sm" onClick={() => remove(athlete._id, athlete.profile?.displayName ?? athlete.email)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>Invite an athlete</h3>
        {inviteMsg && <div className={`alert ${inviteMsg.startsWith('Inv') ? 'success' : 'error'}`}>{inviteMsg}</div>}
        <form onSubmit={invite} className="form-inline">
          <input
            type="email"
            placeholder="athlete@email.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
          />
          <button className="btn-primary" type="submit" disabled={inviting}>
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      </div>
    </div>
  );
}
