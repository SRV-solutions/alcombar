import { dniDots, splitMarked, type AuthorizationContent, type AuthorizationText, type SignatureData } from '@shared';
import { SignatureView } from './SignaturePad';
import type { AdultSignature } from './types';
import './authorization.css';

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** Texto de la planilla: los datos completados van en negrita, como en las planillas que completa el Grupo. */
function Marked({ text }: { text: string }) {
  return (
    <>
      {splitMarked(text).map((s, i) => (s.italic ? <b key={i}><i>{s.text}</i></b> : s.bold ? <b key={i}>{s.text}</b> : <span key={i}>{s.text}</span>))}
    </>
  );
}

/** Renglón de firma: el trazo sobre la línea punteada. */
function SignLine({ label, data, pending }: { label: string; data?: SignatureData | null; pending?: string }) {
  return (
    <div className="auth-sign">
      <span className="auth-sign-label">{label}:</span>
      <span className="auth-sign-area">
        {data ? <SignatureView data={data} className="auth-sign-ink" /> : pending ? <span className="auth-sign-pending">{pending}</span> : null}
      </span>
    </div>
  );
}

function AdultBlock({ s, withFunction, pending }: { s?: AdultSignature | null; withFunction?: boolean; pending: string }) {
  return (
    <div className="auth-adult">
      <SignLine label="Firma" data={s?.signature} pending={s ? undefined : pending} />
      <p>
        Aclaración: <b>{s?.name ?? ''}</b>
      </p>
      <p>
        DNI: <b>{s ? dniDots(s.dni) : ''}</b>
      </p>
      {withFunction ? (
        <p>
          Función en el Grupo Scout: <b>{s?.function ?? ''}</b>
        </p>
      ) : null}
    </div>
  );
}

/**
 * La planilla con los datos completos, para leer en pantalla. Sin firmas es lo que el responsable lee antes de
 * firmar; con firmas es el documento final. El PDF que se descarga lo arma el servidor con este mismo texto y la
 * disposición de la planilla oficial.
 */
export function AuthorizationPaper({
  content,
  text,
  signature,
  custodySignature,
  witnesses = [],
  aval,
  proof,
  voided,
}: {
  content: AuthorizationContent;
  text: AuthorizationText;
  signature?: SignatureData | null;
  custodySignature?: SignatureData | null;
  witnesses?: AdultSignature[];
  aval?: AdultSignature | null;
  /** Constancia de la firma en pantalla (solo en el documento ya firmado). */
  proof?: { signedAt: string; attendedBy: { name: string; dni: string | null }; hash: string } | null;
  voided?: { at: string | null; reason: string | null } | null;
}) {
  return (
    <div className={`auth-paper ${voided ? 'voided' : ''}`}>
      {voided ? <div className="auth-void">ANULADA</div> : null}
      <header className="auth-head">
        <img src="/saac/scouts-de-argentina.png" alt="Scouts de Argentina" />
        <div>
          {text.header.map((h) => (
            <div key={h} className="auth-head-title">
              {h}
            </div>
          ))}
          <div>{text.official ? `Planilla Versión: ${text.version}` : `Planilla del Grupo Scout · Versión: ${text.version}`}</div>
          <div>www.scouts.org.ar</div>
        </div>
      </header>

      <h1 className="auth-title">
        {text.title.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </h1>

      {text.addressee ? (
        <p className="auth-addressee">
          {text.addressee.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </p>
      ) : null}

      {text.paragraphs.map((p, i) => (
        <p key={i} className={`auth-p ${p.kind}`}>
          <Marked text={p.text} />
        </p>
      ))}

      <SignLine label={text.signatureLabel} data={signature} />
      {content.kind === 'imagen' ? (
        <p className="auth-aclaracion">
          Aclaración: <b>{content.signer.name}</b> · D.N.I: <b>{dniDots(content.signer.dni)}</b>
        </p>
      ) : null}

      {text.witnesses ? (
        <>
          {text.custody ? (
            <p className="auth-p item">
              <Marked text={text.custody.text} />
            </p>
          ) : null}
          {text.custody?.filled ? <SignLine label="Firma" data={custodySignature} /> : null}
          <h2 className="auth-sub line">TESTIGOS (5)</h2>
          <div className="auth-cols">
            {Array.from({ length: text.witnesses }, (_, i) => (
              <AdultBlock key={i} s={witnesses[i]} pending={proof ? 'Falta la firma del testigo' : ''} />
            ))}
          </div>
        </>
      ) : null}

      {text.aval ? (
        <>
          <h2 className="auth-sub line">AVAL DE LOS RESPONSABLES SCOUTS (4)</h2>
          <p className="auth-p item">
            <Marked text={text.aval} />
          </p>
          <AdultBlock s={aval} withFunction pending={proof ? 'Falta el aval' : ''} />
        </>
      ) : null}

      {text.footnotes.length ? (
        <ol className="auth-notes">
          {text.footnotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ol>
      ) : null}

      {proof ? (
        <div className="auth-proof">
          <b>Constancia de firma en pantalla.</b> Firmada con trazo manuscrito sobre la pantalla el {when(proof.signedAt)}, en presencia de {proof.attendedBy.name}
          {proof.attendedBy.dni ? ` (DNI ${dniDots(proof.attendedBy.dni)})` : ''}, educador/a del Grupo, en cuyo dispositivo se firmó.
          {witnesses.length ? ` Testigos: ${witnesses.map((w) => `${w.name} (${when(w.signedAt)})`).join('; ')}.` : ''}
          {aval ? ` Aval: ${aval.name} (${when(aval.signedAt)}).` : ''} Código de verificación: <span className="auth-hash">{proof.hash.slice(0, 16).toUpperCase()}</span>.
          {voided ? (
            <>
              {' '}
              <b>
                Anulada{voided.at ? ` el ${when(voided.at)}` : ''}
                {voided.reason ? `: ${voided.reason}` : ''}.
              </b>
            </>
          ) : null}
        </div>
      ) : null}

      <footer className="auth-foot">
        <img src="/saac/wosm-pie.png" alt="Miembro de la Organización Mundial del Movimiento Scout" />
        <p>
          <i>Scouts de Argentina Asociación Civil</i>, es una organización sin fines de lucro, con Personería Jurídica Nacional N° 1645416 – Res IGJ N° 999 del 24 de septiembre de 1998. Sede Nacional:{' '}
          <i>Libertad 1282</i> – CABA – C1012AAZ – Argentina – Tel: +54-11-4811-0185 CUIT 30-69732250-3 – IVA Exento
        </p>
      </footer>
    </div>
  );
}
