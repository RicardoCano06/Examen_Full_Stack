import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import PersonasList from './pages/PersonasList';
import Detalle from './pages/Detalle';
import Editar from './pages/Editar';
import Auditoria from './pages/Auditoria';

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/" element={<PersonasList />} />
            <Route path="/personas/:id" element={<Detalle />} />
            <Route path="/editar/:id" element={<Editar />} />
            <Route path="/auditoria" element={<Auditoria />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
