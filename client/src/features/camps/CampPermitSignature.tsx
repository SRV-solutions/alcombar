import { useState } from 'react';
import { PenLine, Stamp } from 'lucide-react';
import { formatDate, type SignatureData } from '@shared';
import { useToast } from '../../lib/toast';
import { Button, Card, ConfirmButton, Modal } from '../../components/ui';
import { SignDialog } from '../authorizations/SignDialog';
import { SignatureView } from '../authorizations/SignaturePad';
import type { CampPermit } from './types';

const when = (iso: string) => {
  const d = new Date(iso);
  return `${formatDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)} a las ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const day = (iso: string) => when(iso).split(' a las ')[0];

/**
 * Firma en pantalla del Jefe/a de Campo sobre el Permiso de Acampe. Con su propio usuario puede dibujarla o aplicar
 * su última firma ya registrada en la app (un aval, por ejemplo); en el dispositivo de otra persona, la dibuja.
 */
export function CampPermitSignature({
  p,
  onSign,
  onRemove,
}: {
  p: CampPermit;
  /** Firma (guardando antes lo que haya sin guardar). */
  onSign: (body: { signature?: SignatureData; useSaved?: boolean }) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const toast = useToast();
  const [dialog, setDialog] = useState<'draw' | 'saved' | null>(null);
  const [busy, setBusy] = useState(false);
  const s = p.signature;
  const chief = p.auto.chief;
  const saved = p.sign.saved;
  const how = s ? (s.reused ? ' con su firma guardada' : s.onDeviceOf ? `, en el dispositivo de ${s.onDeviceOf}` : '') : '';
  const useSaved = async () => {
    setBusy(true);
    try {
      await onSign({ useSaved: true });
      setDialog(null);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Firma del Jefe/a de Campo">
      {s?.valid ? (
        <div className="alert alert-ok">
          Firmado por <strong>{s.name}</strong> el {when(s.signedAt)}
          {how}. La firma sale en el PDF, con su constancia en una hoja aparte.
        </div>
      ) : s ? (
        <div className="alert alert-warn">
          <strong>Hay que firmar de nuevo:</strong> el permiso se firmó el {when(s.signedAt)}, pero después cambiaron sus datos (o los inscriptos, o el Jefe/a de Campo). La
          firma no sale en el PDF hasta que se vuelva a firmar.
        </div>
      ) : (
        <p style={{ marginTop: 0 }}>Todavía no está firmado: el PDF sale con el lugar de la firma en blanco, para firmarlo a mano.</p>
      )}
      {s?.valid ? <SignatureView data={s.data} className="permit-signature" /> : null}
      {!chief ? (
        <p className="muted" style={{ marginBottom: 0 }}>Primero elegí al Jefe/a de Campo, en «Editar».</p>
      ) : p.sign.canSign ? (
        <div className="row" style={{ marginTop: 10 }}>
          {p.sign.isChief && saved ? (
            <Button id="btn-permit-sign-saved" onClick={() => setDialog('saved')}>
              <Stamp /> Firmar con mi firma guardada
            </Button>
          ) : null}
          <Button id="btn-permit-sign" variant={p.sign.isChief && saved ? 'secondary' : 'primary'} onClick={() => setDialog('draw')}>
            <PenLine /> {s?.valid ? 'Firmar de nuevo con el dedo' : 'Firmar con el dedo'}
          </Button>
          {s ? (
            <ConfirmButton variant="ghost" title="Quitar la firma" message="El permiso queda sin firmar: el PDF vuelve a salir con el lugar de la firma en blanco." confirmLabel="Quitar la firma" onConfirm={onRemove}>
              Quitar la firma
            </ConfirmButton>
          ) : null}
        </div>
      ) : (
        <p className="muted" style={{ marginBottom: 0 }}>
          Lo firma {chief.name} desde su usuario, o con el dedo en el dispositivo de quien puede editar el campamento.
        </p>
      )}
      {p.sign.canSign && !p.sign.isChief ? (
        <p className="muted" style={{ margin: '8px 0 0' }}>
          Firma {chief?.name}, en persona, en este dispositivo. Desde su propio usuario puede además usar su firma ya guardada.
        </p>
      ) : null}

      {dialog === 'draw' ? (
        <SignDialog title="Firma del Jefe/a de Campo" confirmLabel="Firmar el permiso" onClose={() => setDialog(null)} onSign={(signature) => onSign({ signature })}>
          <p style={{ margin: 0 }}>
            {p.sign.isChief ? 'Firmás el Permiso de Acampe como Jefe/a de Campo.' : `Firma ${chief?.name}, Jefe/a de Campo, que está presente.`} Si después cambian los datos
            del permiso, hay que volver a firmar.
          </p>
        </SignDialog>
      ) : null}
      {dialog === 'saved' && saved ? (
        <Modal
          title="Firmar con mi firma guardada"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button loading={busy} onClick={useSaved}>
                <Stamp /> Firmar el permiso
              </Button>
            </>
          }
        >
          <div className="stack">
            <p style={{ margin: 0 }}>
              Es tu última firma registrada en la app, del {day(saved.signedAt)}. Se aplica al Permiso de Acampe como Jefe/a de Campo y queda anotado que usaste la firma
              guardada.
            </p>
            <SignatureView data={saved.signature} className="permit-signature" />
          </div>
        </Modal>
      ) : null}
    </Card>
  );
}
