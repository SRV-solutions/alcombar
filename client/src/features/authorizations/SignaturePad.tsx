import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import type { SignatureData } from '@shared';
import { Button } from '../../components/ui';

/** Trazo → camino SVG suavizado (curvas por los puntos medios). */
function strokePath(s: number[]): string {
  const pts: [number, number][] = [];
  for (let i = 0; i + 2 < s.length; i += 3) pts.push([s[i], s[i + 1]]);
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]} l0.1 0.1`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0]} ${pts[i][1]} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

/** Muestra una firma guardada (el trazo, en tinta). Se ve igual en pantalla y en el PDF. */
export function SignatureView({ data, className, style }: { data: SignatureData | null | undefined; className?: string; style?: React.CSSProperties }) {
  if (!data?.strokes?.length) return null;
  return (
    <svg className={className} style={style} viewBox={`0 0 ${data.w} ${data.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Firma">
      {data.strokes.map((s, i) => (
        <path key={i} d={strokePath(s)} fill="none" stroke="#0b1f4a" strokeWidth={Math.max(2, data.w / 220)} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/**
 * Recuadro para firmar con el dedo (o con el mouse o un lápiz). Guarda el trazo punto por punto con su tiempo:
 * no es una imagen pegada, es la firma hecha en el momento.
 */
export function SignaturePad({ value, onChange, label = 'Firmá con el dedo dentro del recuadro' }: { value: SignatureData | null; onChange: (v: SignatureData | null) => void; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<number[][]>(value?.strokes ?? []);
  const current = useRef<number[] | null>(null);
  const t0 = useRef<number>(0);
  const [empty, setEmpty] = useState(!value?.strokes?.length);

  const size = () => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  };
  const redraw = () => {
    const c = canvas.current;
    if (!c) return;
    const { w, h } = size();
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b1f4a';
    for (const s of [...strokes.current, ...(current.current ? [current.current] : [])]) {
      ctx.beginPath();
      for (let i = 0; i + 2 < s.length; i += 3) (i === 0 ? ctx.moveTo(s[i], s[i + 1]) : ctx.lineTo(s[i], s[i + 1]));
      if (s.length === 3) ctx.lineTo(s[0] + 0.1, s[1] + 0.1);
      ctx.stroke();
    }
  };
  useEffect(() => {
    redraw();
    const onResize = () => redraw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    if (!t0.current) t0.current = performance.now();
    return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10, Math.round(performance.now() - t0.current)];
  };
  const emit = () => {
    const { w, h } = size();
    setEmpty(!strokes.current.length);
    onChange(strokes.current.length ? { w, h, strokes: strokes.current } : null);
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvas.current!.setPointerCapture(e.pointerId);
    current.current = point(e);
    redraw();
  };
  const move = (e: React.PointerEvent) => {
    if (!current.current) return;
    e.preventDefault();
    if (current.current.length < 8700) current.current.push(...point(e));
    redraw();
  };
  const up = () => {
    if (!current.current) return;
    if (strokes.current.length < 120) strokes.current = [...strokes.current, current.current];
    current.current = null;
    redraw();
    emit();
  };
  const clear = () => {
    strokes.current = [];
    current.current = null;
    t0.current = 0;
    redraw();
    emit();
  };

  return (
    <div className="sigpad">
      <div className="sigpad-box">
        <canvas ref={canvas} className="sigpad-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label={label} />
        {empty ? <span className="sigpad-hint">{label}</span> : null}
        <span className="sigpad-line" />
      </div>
      <div className="row between">
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          Con el dedo en el celular o la tablet, o con el mouse.
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={empty}>
          <Eraser /> Borrar y firmar de nuevo
        </Button>
      </div>
    </div>
  );
}
