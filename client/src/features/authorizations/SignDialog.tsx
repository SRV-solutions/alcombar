import { useState, type ReactNode } from 'react';
import { PenLine } from 'lucide-react';
import { MIN_SIGNATURE_POINTS, signaturePoints, type SignatureData } from '@shared';
import { useToast } from '../../lib/toast';
import { Button, Modal } from '../../components/ui';
import { SignaturePad } from './SignaturePad';

/** Ventana para que un educador firme con el dedo (testigo o aval). */
export function SignDialog({
  title,
  children,
  confirmLabel = 'Firmar',
  disabled,
  onSign,
  onClose,
}: {
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  disabled?: boolean;
  onSign: (signature: SignatureData) => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [busy, setBusy] = useState(false);
  const ok = signaturePoints(signature) >= MIN_SIGNATURE_POINTS;
  const save = async () => {
    if (!signature) return;
    setBusy(true);
    try {
      await onSign(signature);
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={busy} disabled={!ok || disabled}>
            <PenLine /> {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="stack">
        {children}
        <SignaturePad value={signature} onChange={setSignature} />
      </div>
    </Modal>
  );
}
