import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';

export default function AR({ interessados = [] }) {
  const { cartorio } = useApp();

  const [busca,       setBusca]       = useState('');
  const [selecionado, setSelecionado] = useState(null);

  const remetente = {
    nome:     cartorio?.nome     || '',
    endereco: cartorio?.endereco || '',
    bairro:   cartorio?.bairro   || '',
    cidade:   cartorio?.cidade   || '',
    uf:       cartorio?.uf       || 'MT',
    cep:      cartorio?.cep      || '',
  };

  const lista = busca.trim().length < 2 ? [] : interessados.filter(i =>
    (i.nome + (i.cpf||'') + (i.cidade||'')).toLowerCase().includes(busca.toLowerCase())
  ).slice(0, 8);

  const selecionar = (i) => { setSelecionado(i); setBusca(i.nome); };
  const limpar     = ()  => { setSelecionado(null); setBusca(''); };

  const fmtEnd = (nome, end, cidade, uf, cep) =>
    [nome, end, cidade ? `${cep || ''} - ${cidade}${uf ? ` - ${uf}` : ''}` : '']
      .filter(Boolean).map(l => `<div>${l}</div>`).join('');

  const gerarAR = () => {
    const dest   = selecionado;
    const endDest = fmtEnd(dest.nome, dest.endereco || '', dest.cidade || '', 'MT', dest.cep || '');
    const endRem  = fmtEnd(remetente.nome, remetente.endereco, remetente.cidade, remetente.uf, remetente.cep);

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title></title>
<style>
  @page { size: 210mm 99mm landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
  body { width: 210mm; height: 99mm; padding: 2mm 27mm; font-size: 8px; color: #000; background: #fff; }
  @media print { @page { margin: 0; } }
  .ar { width: 100%; height: 100%; border: 1.5px solid #000; display: grid; grid-template-columns: 14mm 1fr; }
  .lateral { border-right: 1.5px solid #000; display: flex; align-items: center; justify-content: center; }
  .lateral span { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 6px; text-align: center; line-height: 1.4; }
  .corpo { display: flex; flex-direction: column; height: 100%; }
  .hdr { display: grid; grid-template-columns: auto 1fr auto auto; border-bottom: 1px solid #000; height: 16mm; }
  .hdr-logo { display: flex; align-items: center; padding: 2mm; border-right: 1px solid #000; }
  .hdr-logo .brand { font-size: 12px; font-weight: 900; color: #005CA8; }
  .hdr-titulo { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2mm; }
  .hdr-titulo .t1 { font-size: 8px; font-weight: bold; }
  .hdr-titulo .t2 { font-size: 8px; }
  .hdr-ar { display: flex; align-items: center; padding: 0 4mm; font-size: 22px; font-weight: 900; border-left: 1px solid #000; border-right: 1px solid #000; }
  .hdr-post { padding: 2mm; font-size: 7px; font-weight: bold; min-width: 34mm; }
  .meio { display: grid; grid-template-columns: 1fr 34mm; border-bottom: 1px solid #000; flex: 1; min-height: 0; }
  .dest-col { padding: 2mm; border-right: 1px solid #000; overflow: hidden; }
  .lbl { font-size: 6.5px; font-weight: bold; margin-bottom: 1mm; }
  .dados { font-size: 10px; line-height: 1.6; margin-bottom: 1.5mm; }
  .barcode { border: 1px dashed #aaa; padding: 1mm; margin: 1mm 0; text-align: center; font-size: 6px; color: #666; }
  .carimbo-col { display: flex; flex-direction: column; }
  .carimbo-top { flex: 1; border-bottom: 1px solid #000; padding: 2mm; font-size: 6.5px; font-weight: bold; }
  .carimbo-bot { flex: 1; padding: 2mm; font-size: 6.5px; font-weight: bold; }
  /* baixo: tent | obs+motivo(empilhados) | rubrica */
  .baixo { display: grid; grid-template-columns: 42mm 1fr 26mm; border-bottom: 1px solid #000; height: 20mm; }
  .tent { padding: 2mm; border-right: 1px solid #000; }
  .tent .lbl2 { font-size: 8.5px; font-weight: bold; margin-bottom: 1mm; }
  .tent .ln { font-size: 8.5px; margin: 2px 0; }
  .centro-col { display: flex; flex-direction: column; border-right: 1px solid #000; }
  .obs { padding: 1.5mm 2mm; border-bottom: 1px solid #000; font-size: 6.5px; font-weight: bold; flex: 0 0 auto; }
  .motivo { padding: 1.5mm 2mm; flex: 1; }
  .motivo .lbl2 { font-size: 7.5px; font-weight: bold; margin-bottom: 0.5mm; }
  .motivo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .mi { font-size: 7.5px; line-height: 1.5; }
  .rubrica { padding: 2mm; font-size: 6px; font-weight: bold; }
  .rodape { display: flex; flex-direction: column; }
  .rodape-row { display: grid; grid-template-columns: 1fr 36mm; height: 9mm; border-top: 1px solid #000; }
  .rc { padding: 2mm; border-right: 1px solid #000; font-size: 6.5px; font-weight: bold; }
  .rc:last-child { border-right: none; }
</style>
</head><body>
<div class="ar">
  <div class="lateral"><span>ÁREA DE COLA NO VERSO</span></div>
  <div class="corpo">
    <div class="hdr">
      <div class="hdr-logo"><div class="brand">Correios</div></div>
      <div class="hdr-titulo"><div class="t1">AVISO DE</div><div class="t2">RECEBIMENTO</div></div>
      <div class="hdr-ar">AR</div>
      <div class="hdr-post">DATA DE POSTAGEM</div>
    </div>
    <div class="meio">
      <div class="dest-col">
        <div class="lbl">DESTINATÁRIO</div>
        <div class="dados">${endDest}</div>
        <div class="barcode">(CÓDIGO DE BARRAS OU Nº DE REGISTRO DO OBJETO)</div>
        <div class="lbl" style="margin-top:2mm">ENDEREÇO PARA DEVOLUÇÃO DO AR</div>
        <div class="dados">${endRem}</div>
      </div>
      <div class="carimbo-col">
        <div class="carimbo-top">UNIDADE DE POSTAGEM</div>
        <div class="carimbo-bot">CARIMBO<br>UNIDADE DE ENTREGA</div>
      </div>
    </div>
    <div class="baixo">
      <div class="tent">
        <div class="lbl2">TENTATIVAS DE ENTREGA</div>
        <div class="ln">1ª ____/____/______ _____:_____h</div>
        <div class="ln">2ª ____/____/______ _____:_____h</div>
        <div class="ln">3ª ____/____/______ _____:_____h</div>
      </div>
      <div class="centro-col">
        <div class="obs">OBSERVAÇÃO</div>
        <div class="motivo">
          <div class="lbl2">MOTIVO DE DEVOLUÇÃO</div>
          <div class="motivo-grid">
            <div class="mi">1 Mudou-se</div>        <div class="mi">5 Recusado</div>
            <div class="mi">2 End. insuficiente</div><div class="mi">6 Não procurado</div>
            <div class="mi">3 Não existe o nº</div>  <div class="mi">7 Ausente</div>
            <div class="mi">4 Desconhecido</div>     <div class="mi">8 Falecido</div>
            <div class="mi">9 Outros</div>
          </div>
        </div>
      </div>
      <div class="rubrica">RUBRICA E MATRÍCULA DO CARTEIRO</div>
    </div>
    <div class="rodape">
      <div class="rodape-row">
        <div class="rc">ASSINATURA DO RECEBEDOR</div>
        <div class="rc">DATA DE ENTREGA</div>
      </div>
      <div class="rodape-row">
        <div class="rc">NOME LEGÍVEL DO RECEBEDOR</div>
        <div class="rc">Nº DOC. DE IDENTIDADE</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=950,height=620');
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  const gerarEtiqueta = () => {
    const dest = selecionado;
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title></title>
<style>
  @page { size: 100mm 60mm portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 100mm; height: 60mm; display: flex; align-items: center; justify-content: center; background: #fff; }
  @media print { @page { margin: 0; } }
  .etiqueta { width: 94mm; border: 1.5px solid #000; padding: 4mm; font-family: Arial, sans-serif; }
  .tit { font-size: 7px; font-weight: bold; text-transform: uppercase; color: #666; border-bottom: 1px solid #ccc; margin-bottom: 3mm; padding-bottom: 1mm; }
  .nome { font-size: 12px; font-weight: 900; margin-bottom: 2mm; }
  .end  { font-size: 10px; line-height: 1.7; }
  .cep  { font-size: 11px; font-weight: bold; margin-top: 2mm; letter-spacing: 0.5px; }
  .cel  { font-size: 9px; color: #444; margin-top: 1.5mm; }
</style>
</head><body>
<div class="etiqueta">
  <div class="tit">Destinatário</div>
  <div class="nome">${dest.nome}</div>
  <div class="end">${dest.endereco || ''}</div>
  ${dest.cidade ? `<div class="end">${dest.cidade} - MT</div>` : ''}
  ${dest.cep    ? `<div class="cep">CEP: ${dest.cep}</div>` : ''}
  ${dest.telefone ? `<div class="cel">📱 ${dest.telefone}</div>` : ''}
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=500,height=400');
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  return (
    <div>

      {/* Remetente */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">📬 Remetente (Cartório)</div></div>
        <div style={{ padding: '8px 16px 12px', fontSize: 13, lineHeight: 2 }}>
          <strong>{remetente.nome || '—'}</strong><br />
          {remetente.endereco}{remetente.bairro ? `, ${remetente.bairro}` : ''}<br />
          {remetente.cep ? `${remetente.cep} - ` : ''}{remetente.cidade}{remetente.uf ? ` - ${remetente.uf}` : ''}
        </div>
        <div style={{ padding: '0 16px 10px', fontSize: 11, color: 'var(--color-text-muted)' }}>
          * Dados gerenciados em Configurações → Dados do Cartório
        </div>
      </div>

      {/* Busca */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">🔍 Buscar Destinatário</div></div>
        <div style={{ padding: 16 }}>
          <div style={{ position: 'relative' }}>
            <input className="form-input"
              placeholder="Digite o nome do interessado..."
              value={busca}
              onChange={e => { setBusca(e.target.value); if (selecionado) setSelecionado(null); }}
              autoFocus />
            {selecionado && (
              <button onClick={limpar} style={{ position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 16, color: 'var(--color-text-muted)' }}>✕</button>
            )}
          </div>

          {!selecionado && lista.length > 0 && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, marginTop: 4,
              background: 'var(--color-surface)', overflow: 'hidden' }}>
              {lista.map(i => (
                <div key={i.id} onClick={() => selecionar(i)}
                  style={{ padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border)', fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div style={{ fontWeight: 700 }}>{i.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {[i.endereco, i.cidade].filter(Boolean).join(' — ')}
                    {i.cep ? ` · CEP ${i.cep}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!selecionado && busca.length >= 2 && lista.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Nenhum interessado encontrado.
            </div>
          )}
        </div>
      </div>

      {/* Selecionado */}
      {selecionado && (
        <div className="card">
          <div className="card-header"><div className="card-title">✅ Destinatário Selecionado</div></div>
          <div style={{ padding: '10px 16px 4px', fontSize: 13, lineHeight: 2 }}>
            <strong>{selecionado.nome}</strong><br />
            {selecionado.endereco || '—'}<br />
            {selecionado.cep ? `${selecionado.cep} - ` : ''}{selecionado.cidade || ''}
            {selecionado.telefone ? <><br />📱 {selecionado.telefone}</> : null}
          </div>
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px 16px' }}>
            <button className="btn btn-primary"   onClick={gerarAR}>📮 Gerar AR</button>
            <button className="btn btn-secondary" onClick={gerarEtiqueta}>🏷️ Gerar Etiqueta</button>
            <button className="btn btn-ghost" onClick={limpar} style={{ marginLeft: 'auto' }}>✕ Limpar</button>
          </div>
        </div>
      )}

    </div>
  );
}
