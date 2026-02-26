import { useState, useContext } from 'react';
import API from '../api';
import { AuthContext } from '../context/AuthContext';
import { KeyRound, Mail, AlertCircle, Fingerprint } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await API.post('/auth/login', { email, mot_de_passe: password });
      login(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion au serveur');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-logo">
          <Fingerprint size={28} />
        </div>
        <h2 style={{ marginBottom: '8px' }}>DevPortal B2B</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Connectez-vous à votre espace de travail
        </p>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Identifiant ou Email</label>
            <div className="input-wrapper">
              <Mail size={18} />
              <input 
                type="text" 
                placeholder="admin@devportal.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="input-group">
            <label>Mot de passe</label>
            <div className="input-wrapper">
              <KeyRound size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '30px' }}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;