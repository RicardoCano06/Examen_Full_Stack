import { useNavigate, useParams } from 'react-router-dom';
import EditarForm from '../components/EditarForm';
import PageHeader from '../components/PageHeader';

export default function Editar() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Editar persona" description="Actualice los datos o reemplace las fotos del documento" />
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-900/5">
        <EditarForm id={id} onSaved={() => navigate(`/personas/${id}`)} />
      </div>
    </div>
  );
}
