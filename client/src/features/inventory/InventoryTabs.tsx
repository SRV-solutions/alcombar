import { useNavigate } from 'react-router-dom';
import { Tabs } from '../../components/ui';

/** Pestañas Bienes / Préstamos del inventario. */
export function InventoryTabs({ value }: { value: 'bienes' | 'prestamos' }) {
  const navigate = useNavigate();
  return (
    <Tabs
      tabs={[
        { key: 'bienes', label: 'Bienes' },
        { key: 'prestamos', label: 'Préstamos' },
      ]}
      value={value}
      onChange={(k) => navigate(k === 'bienes' ? '/inventario' : '/inventario/prestamos')}
    />
  );
}
