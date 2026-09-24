import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PersonasList from './pages/PersonasList';
import Detalle from './pages/Detalle';
import Editar from './pages/Editar';
import Auditoria from './pages/Auditoria';

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased text-slate-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<PersonasList />} />
          <Route path="/personas/:id" element={<Detalle />} />
          <Route path="/editar/:id" element={<Editar />} />
          <Route path="/auditoria" element={<Auditoria />} />
        </Routes>
      </main>
    </div>
  );
}
