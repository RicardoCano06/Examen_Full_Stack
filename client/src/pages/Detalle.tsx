import { Link, useParams } from 'react-router-dom';
import Button from '../components/Button';
import DetalleContenido from '../components/DetalleContenido';

export default function Detalle() {
  const { id = '' } = useParams();

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <Link to={`/editar/${id}`}>
          <Button variant="secondary">Editar</Button>
        </Link>
        <Link to="/">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>
      <DetalleContenido id={id} />
    </div>
  );
}
