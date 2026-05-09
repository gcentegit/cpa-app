import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">CPA - Dashboard</h1>
            <p className="text-sm opacity-75">Bienvenido, {user?.nombre} {user?.apellidos}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {darkMode ? '🌙' : '☀️'}
            </button>
            <div className="text-sm">
              <span className="font-medium">Rol:</span> {user?.rol_nombre}
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
          <h2 className="text-xl font-semibold mb-4">Panel de Control</h2>
          <p className="mb-4">
            Estás conectado como <strong>{user?.email}</strong>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="font-semibold mb-2">Locales</h3>
              <p className="text-3xl font-bold">590</p>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="font-semibold mb-2">Marcas</h3>
              <p className="text-3xl font-bold">8</p>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <h3 className="font-semibold mb-2">Departamentos</h3>
              <p className="text-3xl font-bold">8</p>
            </div>
          </div>
        </div>

        <div className={`mt-6 rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
          <h2 className="text-xl font-semibold mb-4">Estado del Sistema</h2>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Backend API: Online</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Base de datos: Conectada</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Autenticación: {user?.totp_secret ? '2FA habilitado' : '2FA disponible'}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
