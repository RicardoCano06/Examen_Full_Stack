import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PersonasList from './pages/PersonasList';
import Registrar from './pages/Registrar';
import Buscar from './pages/Buscar';
import Auditoria from './pages/Auditoria';

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
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
