import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login, loginWith2FA, user } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (requires2FA) {
        await loginWith2FA(userId, totpCode);
        navigate('/');
      } else {
        const result = await login(email, password);
        if (result.requires2FA) {
          setRequires2FA(true);
          if (result.userId) {
            setUserId(result.userId);
          }
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error en el login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`max-w-md w-full mx-4 p-8 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <h1 className="text-3xl font-bold text-center mb-6">
          {requires2FA ? 'Autenticación de dos factores' : 'CPA - Login'}
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!requires2FA ? (
            <>
              <div>
                <label className="block mb-2 font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block mb-2 font-medium">Código 2FA (Google Authenticator)</label>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                placeholder="000000"
                required
                maxLength={6}
                autoFocus
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Procesando...' : requires2FA ? 'Verificar' : 'Iniciar sesión'}
          </button>

          {requires2FA && (
            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setUserId('');
                setTotpCode('');
              }}
              className="w-full text-blue-600 hover:underline mt-2"
            >
              Volver
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
