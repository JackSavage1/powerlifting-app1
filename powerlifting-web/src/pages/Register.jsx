import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('athlete');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(email, password, role);
      navigate(user.role === 'coach' ? '/roster' : '/today');
    } catch (err) {
      setError(err.data?.detail ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>⚡ Powerlifting</h1>
        <h2>Create account</h2>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit} className="form">
          <label>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </label>
          <label>Password <span className="hint">(min 8 characters)</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </label>
          <label>I am a…
            <div className="role-toggle">
              <button type="button" className={role === 'athlete' ? 'active' : ''} onClick={() => setRole('athlete')}>Athlete</button>
              <button type="button" className={role === 'coach' ? 'active' : ''} onClick={() => setRole('coach')}>Coach</button>
            </div>
          </label>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-footer">Have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
