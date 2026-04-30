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
  @page { size: 297mm 110mm landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
  body { width: 297mm; height: 110mm; padding: 3mm 28mm; color: #000; background: #fff; }
  @media print { @page { margin: 0; } }
  .ar { width: 100%; height: 100%; border: 1.5px solid #000; display: grid; grid-template-columns: 13mm 1fr; overflow: hidden; }
  .lateral { border-right: 1.5px solid #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .lateral span { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 5.5px; text-align: center; line-height: 1.3; white-space: nowrap; }
  .corpo { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  /* Header menor */
  .hdr { display: grid; grid-template-columns: auto 1fr auto auto; border-bottom: 1px solid #000; height: 11mm; flex-shrink: 0; }
  .hdr-logo { display: flex; align-items: center; padding: 1.5mm 2mm; border-right: 1px solid #000; }
  .hdr-logo .brand { font-size: 11px; font-weight: 900; color: #005CA8; }
  .hdr-titulo { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1mm; }
  .hdr-titulo .t1 { font-size: 7.5px; font-weight: bold; }
  .hdr-titulo .t2 { font-size: 7.5px; }
  .hdr-ar { display: flex; align-items: center; padding: 0 4mm; font-size: 20px; font-weight: 900; border-left: 1px solid #000; border-right: 1px solid #000; }
  .hdr-post { padding: 1.5mm 2mm; font-size: 6.5px; font-weight: bold; min-width: 30mm; flex-shrink: 0; }
  /* Meio */
  .meio { display: grid; grid-template-columns: 1fr 30mm; border-bottom: 1px solid #000; flex: 1; min-height: 0; overflow: hidden; }
  .dest-col { padding: 1.5mm 2mm; border-right: 1px solid #000; overflow: hidden; }
  .lbl { font-size: 6px; font-weight: bold; margin-bottom: 0.8mm; }
  .dados { font-size: 9px; line-height: 1.5; margin-bottom: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .barcode { border: 1px dashed #aaa; padding: 0.8mm; margin: 0.8mm 0; text-align: center; font-size: 5.5px; color: #666; }
  .carimbo-col { display: flex; flex-direction: column; flex-shrink: 0; }
  .carimbo-top { flex: 1; border-bottom: 1px solid #000; padding: 1.5mm; font-size: 6px; font-weight: bold; }
  .carimbo-bot { flex: 1; padding: 1.5mm; font-size: 6px; font-weight: bold; }
  /* Baixo */
  .baixo { display: grid; grid-template-columns: 40mm 1fr 24mm; border-bottom: 1px solid #000; height: 22mm; flex-shrink: 0; overflow: hidden; }
  .tent { padding: 1.5mm 2mm; border-right: 1px solid #000; }
  .tent .lbl2 { font-size: 7px; font-weight: bold; margin-bottom: 0.8mm; }
  .tent .ln { font-size: 7px; margin: 2px 0; white-space: nowrap; }
  .centro-col { display: flex; flex-direction: column; border-right: 1px solid #000; overflow: hidden; }
  .obs { padding: 1mm 2mm; border-bottom: 1px solid #000; font-size: 6.5px; font-weight: bold; flex-shrink: 0; }
  .motivo { padding: 1mm 2mm; flex: 1; overflow: hidden; }
  .motivo .lbl2 { font-size: 7px; font-weight: bold; margin-bottom: 0.5mm; }
  .motivo-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .mi { font-size: 7px; line-height: 1.45; }
  .rubrica { padding: 1.5mm; font-size: 5.5px; font-weight: bold; }
  /* Rodapé 2 linhas */
  .rodape { display: flex; flex-direction: column; flex-shrink: 0; }
  .rodape-row { display: grid; grid-template-columns: 1fr 30mm; border-top: 1px solid #000; height: 8mm; }
  .rc { padding: 1.5mm 2mm; border-right: 1px solid #000; font-size: 6.5px; font-weight: bold; overflow: hidden; }
  .rc:last-child { border-right: none; }
</style>
</head><body>
<div class="ar">
  <div class="lateral"><span>ÁREA DE COLA NO VERSO</span></div>
  <div class="corpo">
    <div class="hdr">
      <div class="hdr-logo"><img src="data:image/png;base64,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" style="height:8mm;max-width:28mm;object-fit:contain;" alt="Correios" /></div>
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
