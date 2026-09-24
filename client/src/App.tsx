import { Link, Route, Routes } from 'react-router-dom';
import PersonasList from './pages/PersonasList';
import Registrar from './pages/Registrar';
import Buscar from './pages/Buscar';
import Auditoria from './pages/Auditoria';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white shadow">
        <div className="mx-auto flex max-w-5xl gap-4 px-4 py-3">
          <Link className="font-semibold hover:underline" to="/">Personas</Link>
          <Link className="hover:underline" to="/registrar">Registrar</Link>
          <Link className="hover:underline" to="/buscar">Buscar</Link>
          <Link className="hover:underline" to="/auditoria">Auditoría</Link>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<PersonasList />} />
          <Route path="/registrar" element={<Registrar />} />
          <Route path="/buscar" element={<Buscar />} />
          <Route path="/auditoria" element={<Auditoria />} />
        </Routes>
      </main>
    </div>
  );
}
