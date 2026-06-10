import { useEffect, useRef, useState } from 'react';
import { moeda, pct, blocosPara, TIPOS_REFERENCIA } from '../calc.js';
import { salvarCalculo, entrarComGoogle } from '../firebase.js';

function PrecoAnimado({ valor }) {
  const [exibido, setExibido] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const inicio = performance.now();
    const de = exibido;
    const dur = 600;
    cancelAnimationFrame(ref.current);
    function tick(t) {
      const p = Math.min((t - inicio) / dur, 1);
      const suave = 1 - Math.pow(1 - p, 3);
      setExibido(de + (valor - de) * suave);
      if (p < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [valor]);
  return <>{moeda(exibido)}</>;
}

const rotuloRef = (id) => TIPOS_REFERENCIA.find((t) => t.id === id)?.rotulo || id;

export default function Resultado({ estado, resultado, usuario, mudar, aoNovoCalculo, aoEditar }) {
  const [salvando, setSalvando] = useState(false);
  const [salvoId, setSalvoId] = useState(null);
  const [erro, setErro] = useState('');

  const r = resultado;
  const unidade = estado.item.unidade || (estado.tipo === 'servico' ? 'serviço' : 'unidade');
  const blocos = blocosPara(estado.tipo);
  const semCustos = r.custoTotal <= 0;

  const degraus = [
    { id: 'custo', nome: 'Preço de custo', valor: r.precoCusto, explica: 'Cobre só os custos básicos. Vender por menos que isso é pagar para trabalhar.' },
    { id: 'minimo', nome: 'Preço mínimo', valor: r.precoMinimo, explica: 'Cobre os custos e o trabalho das pessoas.' },
    { id: 'justo', nome: 'Preço justo', valor: r.precoJusto, explica: 'Cobre custos, trabalho, logística, perdas e o fundo comunitário.' },
    { id: 'sustentavel', nome: 'Preço sustentável', valor: r.precoSustentavel, explica: 'Tudo isso + margem para reinvestir. É o preço que mantém a atividade viva.' },
  ];

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      const id = await salvarCalculo(usuario.uid, estado, r);
      setSalvoId(id);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível salvar agora. O cálculo continua aqui — tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="resultado" id="ficha">
      <div className="ficha-cabecalho">
        <h2 className="etapa-titulo">
          {estado.item.nome || (estado.tipo === 'servico' ? 'Serviço' : 'Produto')}
        </h2>
        <p className="ficha-meta">
          {estado.tipo === 'servico' ? 'Serviço' : 'Produto'}
          {estado.comunidade.nome && <> · {estado.comunidade.nome}</>}
          {estado.comunidade.municipio && <> · {estado.comunidade.municipio}/{estado.comunidade.estado}</>}
          {' '}· {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {semCustos && (
        <div className="alerta atencao" role="alert">
          Nenhum custo foi informado ainda. <button className="link" onClick={aoEditar}>Voltar e preencher os custos</button>
        </div>
      )}

      <div className="escada" role="list">
        {degraus.map((d, i) => (
          <div key={d.id} role="listitem" className={`degrau degrau-${d.id}`} style={{ '--i': i }}>
            <div className="degrau-info">
              <span className="degrau-nome">{d.nome}</span>
              <span className="degrau-explica">{d.explica}</span>
            </div>
            <div className="degrau-preco">
              <strong><PrecoAnimado valor={d.valor} /></strong>
              <small>por {unidade}</small>
            </div>
          </div>
        ))}
      </div>

      {r.alertaFixos && (
        <div className="alerta atencao" role="alert">
          ⚠ Os custos fixos são <b>{pct(r.fixosPct)}</b> do preço — acima do limite recomendado
          de <b>30%</b>. Procure ratear esses custos entre mais produtos ou lotes maiores, ou
          revisar o que entrou como fixo.
        </div>
      )}

      <details className="composicao" open>
        <summary>Como esse preço foi montado (composição)</summary>
        <table>
          <thead>
            <tr><th>Item</th><th>Valor</th><th>% do preço</th></tr>
          </thead>
          <tbody>
            {blocos.map((b) =>
              r.porBloco[b.id] > 0 ? (
                <tr key={b.id} className={b.id === 'fixos' && r.alertaFixos ? 'linha-alerta' : undefined}>
                  <td>{b.titulo}</td>
                  <td>{moeda(r.porBloco[b.id])}</td>
                  <td>{r.custoTotal > 0 ? pct(r.porBloco[b.id] / r.custoTotal) : '—'}</td>
                </tr>
              ) : null
            )}
            {r.perdas > 0 && (
              <tr><td>Perdas</td><td>{moeda(r.perdas)}</td><td>{r.custoTotal > 0 ? pct(r.perdas / r.custoTotal) : '—'}</td></tr>
            )}
            <tr className="sub"><td>Subtotal</td><td>{moeda(r.subtotal)}</td><td>{r.custoTotal > 0 ? pct(r.subtotal / r.custoTotal) : '—'}</td></tr>
            {r.fundo > 0 && (
              <tr><td>Fundo comunitário</td><td>{moeda(r.fundo)}</td><td>{r.custoTotal > 0 ? pct(r.fundo / r.custoTotal) : '—'}</td></tr>
            )}
            {r.reinvest > 0 && (
              <tr><td>Margem de reinvestimento</td><td>{moeda(r.reinvest)}</td><td>{r.custoTotal > 0 ? pct(r.reinvest / r.custoTotal) : '—'}</td></tr>
            )}
            <tr className="total"><td>Custo total do lote</td><td>{moeda(r.custoTotal)}</td><td>100%</td></tr>
            {estado.tipo === 'produto' && (
              <tr><td>Quantidade vendável</td><td>{r.quantidade} {unidade}</td><td></td></tr>
            )}
          </tbody>
        </table>
      </details>

      <div className="margem-cartao">
        <h3>Margem de contribuição</h3>
        <p>
          Por quanto você pretende anunciar {estado.tipo === 'servico' ? 'o serviço' : `cada ${unidade}`}?
          A margem de contribuição mostra quanto sobra de cada venda, depois de pagar os custos
          variáveis, para cobrir os custos fixos e o coletivo.
        </p>
        <label className="campo campo-destaque">
          <span>Preço de venda anunciado</span>
          <div className="moeda-input grande">
            <span aria-hidden="true">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={estado.precoVenda || ''}
              placeholder={moeda(r.precoSustentavel).replace('R$', '').trim()}
              onChange={(e) => mudar('precoVenda', e.target.value)}
            />
          </div>
          <small>Custo variável por {unidade}: {moeda(r.custoVariavelUnit)} · Custos fixos do lote: {moeda(r.fixosTotal)}</small>
        </label>

        {r.margem && (
          <div className="margem-resultado">
            <div className="margem-kpis">
              <div className={r.margem.mc > 0 ? 'margem-kpi positiva' : 'margem-kpi negativa'}>
                <strong>{moeda(r.margem.mc)}</strong>
                <small>de sobra em cada {unidade}</small>
              </div>
              <div className={r.margem.mc > 0 ? 'margem-kpi positiva' : 'margem-kpi negativa'}>
                <strong>{pct(r.margem.mcPct)}</strong>
                <small>do preço de venda</small>
              </div>
              {r.margem.unidadesParaFixos && estado.tipo === 'produto' && (
                <div className="margem-kpi">
                  <strong>{r.margem.unidadesParaFixos}</strong>
                  <small>{unidade} para cobrir os custos fixos</small>
                </div>
              )}
            </div>
            <p className="margem-leitura">{r.margem.leitura}</p>
          </div>
        )}
      </div>

      {r.referencias.length > 0 && (
        <div className="comparacoes">
          <h3>Comparação com outros preços</h3>
          {r.referencias.map((ref, i) => (
            <div key={i} className={`comparacao nivel-${ref.nivel}`}>
              <div className="comparacao-topo">
                <span className="comparacao-quem">
                  {rotuloRef(ref.tipo)}{ref.fonte && <small> — {ref.fonte}</small>}
                </span>
                <span className="comparacao-valor">{moeda(ref.valorNum)}</span>
              </div>
              <p className="comparacao-leitura">
                {ref.leitura}{' '}
                <b>
                  ({ref.diferenca >= 0 ? '+' : '−'}{moeda(Math.abs(ref.diferenca))} em relação ao preço sustentável)
                </b>
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="acoes no-print">
        {salvoId ? (
          <div className="alerta sucesso" role="status">✓ Cálculo salvo no seu histórico.</div>
        ) : usuario ? (
          <button className="botao primario" onClick={salvar} disabled={salvando || semCustos}>
            {salvando ? 'Salvando…' : 'Salvar no histórico'}
          </button>
        ) : (
          <button className="botao primario" onClick={() => entrarComGoogle().catch(console.error)}>
            Entrar com Google para salvar
          </button>
        )}
        <button className="botao secundario" onClick={() => window.print()}>
          Imprimir / PDF da ficha
        </button>
        <button className="botao terciario" onClick={aoEditar}>← Ajustar valores</button>
        <button className="botao terciario" onClick={aoNovoCalculo}>Novo cálculo</button>
      </div>
      {erro && <p className="alerta atencao" role="alert">{erro}</p>}

      <p className="ficha-rodape so-print">
        Ficha gerada pela calculadora Preço Justo Amazônia — precificação de produtos e serviços da
        sociobiodiversidade. Valores em reais (R$).
      </p>
    </div>
  );
}
