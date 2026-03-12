import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Athlete pages
import Today from './pages/athlete/Today.jsx';
import LogSession from './pages/athlete/LogSession.jsx';
import History from './pages/athlete/History.jsx';
import PRs from './pages/athlete/PRs.jsx';

// Coach pages
import Roster from './pages/coach/Roster.jsx';
import AthleteView from './pages/coach/AthleteView.jsx';
import Programs from './pages/coach/Programs.jsx';
import ProgramBuilder from './pages/coach/ProgramBuilder.jsx';

function PrivateRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'coach'
    ? <Navigate to="/roster" replace />
    : <Navigate to="/today" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<RootRedirect />} />

        {/* Athlete routes */}
        <Route path="today" element={<PrivateRoute role="athlete"><Today /></PrivateRoute>} />
        <Route path="sessions/:sessionId" element={<PrivateRoute role="athlete"><LogSession /></PrivateRoute>} />
        <Route path="history" element={<PrivateRoute role="athlete"><History /></PrivateRoute>} />
        <Route path="prs" element={<PrivateRoute role="athlete"><PRs /></PrivateRoute>} />

        {/* Coach routes */}
        <Route path="roster" element={<PrivateRoute role="coach"><Roster /></PrivateRoute>} />
        <Route path="athletes/:athleteId" element={<PrivateRoute role="coach"><AthleteView /></PrivateRoute>} />
        <Route path="programs" element={<PrivateRoute role="coach"><Programs /></PrivateRoute>} />
        <Route path="programs/:programId" element={<PrivateRoute role="coach"><ProgramBuilder /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
