import { Link, useParams } from 'react-router-dom';
import Button from '../components/Button';
import DetalleContenido from '../components/DetalleContenido';
import PageHeader from '../components/PageHeader';

export default function Detalle() {
  const { id = '' } = useParams();

  return (
    <div>
      <PageHeader
        title="Detalle de persona"
        description="Ficha con documento de identidad"
        actions={
          <>
            <Link to={`/editar/${id}`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            <Link to="/">
              <Button variant="secondary">Volver</Button>
            </Link>
          </>
        }
      />
      <DetalleContenido id={id} />
    </div>
  );
}
