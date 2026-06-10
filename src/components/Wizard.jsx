import { useEffect, useMemo, useState } from 'react';
import {
  estadoInicial,
  blocosPara,
  calcular,
  moeda,
  novaLinhaCusto,
  novaLinhaTrabalho,
  totalBloco,
  totalLinhaTrabalho,
  parseNum,
  TIPOS_REFERENCIA,
} from '../calc.js';
import Resultado from './Resultado.jsx';

const ESTADOS_BR = ['AC', 'AM', 'AP', 'MA', 'MT', 'PA', 'RO', 'RR', 'TO', 'outro'];
const RASCUNHO_KEY = 'preco-justo:rascunho';

function passosPara(tipo) {
  const passos = [
    { id: 'item', titulo: 'O que vamos precificar?' },
    { id: 'custos', titulo: 'Custos e trabalho' },
  ];
  if (tipo === 'produto') passos.push({ id: 'perdas', titulo: 'Perdas' });
  passos.push(
    { id: 'coletivo', titulo: 'Fundo e futuro' },
    { id: 'referencias', titulo: 'Comparar preços' },
    { id: 'resultado', titulo: 'Resultado' }
  );
  return passos;
}

export default function Wizard({ usuario, estadoExterno, aoConsumirEstadoExterno }) {
  const [estado, setEstado] = useState(() => {
    try {
      const salvo = localStorage.getItem(RASCUNHO_KEY);
      if (salvo) return JSON.parse(salvo);
    } catch { /* rascunho corrompido: começa do zero */ }
    return estadoInicial('produto');
  });
  const [passoIdx, setPassoIdx] = useState(0);

  useEffect(() => {
    if (estadoExterno) {
      setEstado(estadoExterno);
      setPassoIdx(passosPara(estadoExterno.tipo).length - 1);
      aoConsumirEstadoExterno();
    }
  }, [estadoExterno]);

  useEffect(() => {
    try { localStorage.setItem(RASCUNHO_KEY, JSON.stringify(estado)); } catch { /* sem espaço */ }
  }, [estado]);

  const passos = passosPara(estado.tipo);
  const passo = passos[Math.min(passoIdx, passos.length - 1)];
  const resultado = useMemo(() => calcular(estado), [estado]);

  function mudar(caminho, valor) {
    setEstado((e) => {
      const novo = structuredClone(e);
      let alvo = novo;
      const partes = caminho.split('.');
      for (let i = 0; i < partes.length - 1; i++) alvo = alvo[partes[i]];
      alvo[partes[partes.length - 1]] = valor;
      return novo;
    });
  }

  function trocarTipo(tipo) {
    if (tipo === estado.tipo) return;
    setEstado((e) => {
      const base = estadoInicial(tipo);
      return { ...base, comunidade: e.comunidade, item: { ...base.item, nome: e.item.nome } };
    });
    setPassoIdx(0);
  }

  function novoCalculo() {
    const tipo = estado.tipo;
    const comunidade = estado.comunidade;
    setEstado({ ...estadoInicial(tipo), comunidade });
    setPassoIdx(0);
    window.scrollTo({ top: 0 });
  }

  function avancar() {
    setPassoIdx((i) => Math.min(i + 1, passos.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function voltar() {
    setPassoIdx((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const podeAvancar =
    passo.id !== 'item' ||
    (estado.item.nome.trim() && (estado.tipo === 'servico' || parseNum(estado.item.quantidadeVendavel) > 0));

  return (
    <div className="painel">
      <ol className="rio no-print" aria-label="Etapas do cálculo">
        {passos.map((p, i) => (
          <li key={p.id} className={i === passoIdx ? 'porto atual' : i < passoIdx ? 'porto feito' : 'porto'}>
            <button
              type="button"
              onClick={() => i < passoIdx && setPassoIdx(i)}
              disabled={i > passoIdx}
              aria-current={i === passoIdx ? 'step' : undefined}
            >
              <span className="porto-ponto" aria-hidden="true" />
              <span className="porto-rotulo">{p.titulo}</span>
            </button>
          </li>
        ))}
      </ol>

      <section className="etapa" key={passo.id}>
        {passo.id === 'item' && (
          <EtapaItem estado={estado} mudar={mudar} trocarTipo={trocarTipo} />
        )}
        {passo.id === 'custos' && (
          <EtapaCustos estado={estado} setEstado={setEstado} resultado={resultado} />
        )}
        {passo.id === 'perdas' && <EtapaPerdas estado={estado} mudar={mudar} resultado={resultado} />}
        {passo.id === 'coletivo' && <EtapaColetivo estado={estado} mudar={mudar} resultado={resultado} />}
        {passo.id === 'referencias' && <EtapaReferencias estado={estado} setEstado={setEstado} />}
        {passo.id === 'resultado' && (
          <Resultado
            estado={estado}
            resultado={resultado}
            usuario={usuario}
            aoNovoCalculo={novoCalculo}
            aoEditar={() => setPassoIdx(0)}
          />
        )}
      </section>

      {passo.id !== 'resultado' && (
        <div className="navegacao no-print">
          {passoIdx > 0 ? (
            <button className="botao secundario" onClick={voltar}>← Voltar</button>
          ) : <span />}
          <button className="botao primario" onClick={avancar} disabled={!podeAvancar}>
            {passos[passoIdx + 1]?.id === 'resultado' ? 'Ver resultado ✦' : 'Avançar →'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Etapa 1: item + comunidade ---------- */

function EtapaItem({ estado, mudar, trocarTipo }) {
  const [mostrarComunidade, setMostrarComunidade] = useState(Boolean(estado.comunidade.nome));
  const ehProduto = estado.tipo === 'produto';

  return (
    <>
      <h2 className="etapa-titulo">O que vamos precificar?</h2>

      <div className="seletor-tipo" role="radiogroup" aria-label="Tipo">
        <button
          type="button"
          role="radio"
          aria-checked={ehProduto}
          className={ehProduto ? 'tipo-cartao ativo' : 'tipo-cartao'}
          onClick={() => trocarTipo('produto')}
        >
          <span className="tipo-icone" aria-hidden="true">🧺</span>
          <strong>Produto</strong>
          <small>farinha, peixe, castanha, mel, artesanato…</small>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!ehProduto}
          className={!ehProduto ? 'tipo-cartao ativo' : 'tipo-cartao'}
          onClick={() => trocarTipo('servico')}
        >
          <span className="tipo-icone" aria-hidden="true">🛶</span>
          <strong>Serviço</strong>
          <small>guiamento, hospedagem, oficina, transporte…</small>
        </button>
      </div>

      <div className="grade-campos">
        <label className="campo campo-largo">
          <span>Nome do {ehProduto ? 'produto' : 'serviço'} *</span>
          <input
            type="text"
            value={estado.item.nome}
            onChange={(e) => mudar('item.nome', e.target.value)}
            placeholder={ehProduto ? 'Ex.: Farinha de mandioca' : 'Ex.: Guiamento na floresta (1 dia)'}
          />
        </label>

        <label className="campo">
          <span>{ehProduto ? 'Unidade de venda' : 'Unidade de cobrança'}</span>
          <input
            type="text"
            value={estado.item.unidade}
            onChange={(e) => mudar('item.unidade', e.target.value)}
            placeholder={ehProduto ? 'kg, litro, saca, peça…' : 'por dia, por pessoa, por grupo…'}
          />
        </label>

        {ehProduto ? (
          <label className="campo">
            <span>Quantidade para vender *</span>
            <input
              type="text"
              inputMode="decimal"
              value={estado.item.quantidadeVendavel}
              onChange={(e) => mudar('item.quantidadeVendavel', e.target.value)}
              placeholder="Ex.: 100"
            />
            <small>Quantidade que sobra para vender, já tirando o consumo da família.</small>
          </label>
        ) : (
          <label className="campo">
            <span>Pessoas envolvidas</span>
            <input
              type="text"
              inputMode="numeric"
              value={estado.item.pessoas}
              onChange={(e) => mudar('item.pessoas', e.target.value)}
              placeholder="Ex.: 2"
            />
          </label>
        )}
      </div>

      <button
        type="button"
        className="alternar-comunidade"
        onClick={() => setMostrarComunidade((v) => !v)}
        aria-expanded={mostrarComunidade}
      >
        {mostrarComunidade ? '▾' : '▸'} Dados da comunidade <small>(opcional, entra na ficha)</small>
      </button>

      {mostrarComunidade && (
        <div className="grade-campos">
          <label className="campo">
            <span>Comunidade</span>
            <input
              type="text"
              value={estado.comunidade.nome}
              onChange={(e) => mudar('comunidade.nome', e.target.value)}
              placeholder="Ex.: São José do Igarapé"
            />
          </label>
          <label className="campo">
            <span>Associação ou grupo</span>
            <input
              type="text"
              value={estado.comunidade.associacao}
              onChange={(e) => mudar('comunidade.associacao', e.target.value)}
            />
          </label>
          <label className="campo">
            <span>Município</span>
            <input
              type="text"
              value={estado.comunidade.municipio}
              onChange={(e) => mudar('comunidade.municipio', e.target.value)}
            />
          </label>
          <label className="campo">
            <span>Estado</span>
            <select value={estado.comunidade.estado} onChange={(e) => mudar('comunidade.estado', e.target.value)}>
              {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </label>
        </div>
      )}
    </>
  );
}

/* ---------- Etapa 2: custos por bloco ---------- */

function EtapaCustos({ estado, setEstado, resultado }) {
  const blocos = blocosPara(estado.tipo);

  function mudarLinha(blocoId, idx, campo, valor) {
    setEstado((e) => {
      const novo = structuredClone(e);
      novo.custos[blocoId][idx][campo] = valor;
      return novo;
    });
  }
  function addLinha(bloco) {
    setEstado((e) => {
      const novo = structuredClone(e);
      novo.custos[bloco.id].push(bloco.grupo === 'trabalho' ? novaLinhaTrabalho() : novaLinhaCusto());
      return novo;
    });
  }
  function removerLinha(blocoId, idx) {
    setEstado((e) => {
      const novo = structuredClone(e);
      novo.custos[blocoId].splice(idx, 1);
      return novo;
    });
  }

  return (
    <>
      <h2 className="etapa-titulo">Quanto custa para fazer acontecer?</h2>
      <p className="etapa-explica">
        Preencha o que existir no seu caso e deixe o resto em branco. O importante é não esquecer
        o <b>trabalho das pessoas</b> — tempo também é custo.
      </p>

      {blocos.map((bloco) => {
        const linhas = estado.custos[bloco.id] || [];
        const total = totalBloco(bloco, linhas);
        return (
          <details key={bloco.id} className="bloco-custo" open={bloco.id === 'trabalho' || linhas.some((l) => l.desc || parseNum(l.valor) > 0 || parseNum(l.valorUnit) > 0)}>
            <summary>
              <span className="bloco-titulo">{bloco.titulo}</span>
              <span className={total > 0 ? 'bloco-total tem' : 'bloco-total'}>{moeda(total)}</span>
            </summary>
            <p className="bloco-dica">{bloco.dica}</p>

            {bloco.grupo === 'trabalho' ? (
              <div className="linhas">
                {linhas.map((l, i) => (
                  <div className="linha-trabalho" key={i}>
                    <label className="campo">
                      <span>Etapa ou função</span>
                      <input
                        type="text"
                        value={l.desc}
                        onChange={(e) => mudarLinha(bloco.id, i, 'desc', e.target.value)}
                        placeholder="Coleta, preparo, venda…"
                      />
                    </label>
                    <label className="campo mini">
                      <span>Pessoas</span>
                      <input type="text" inputMode="numeric" value={l.pessoas}
                        onChange={(e) => mudarLinha(bloco.id, i, 'pessoas', e.target.value)} />
                    </label>
                    <label className="campo mini">
                      <span>{l.unidadeTempo === 'hora' ? 'Horas' : 'Diárias'}</span>
                      <input type="text" inputMode="decimal" value={l.tempo}
                        onChange={(e) => mudarLinha(bloco.id, i, 'tempo', e.target.value)} />
                    </label>
                    <label className="campo mini">
                      <span>Pagar por</span>
                      <select value={l.unidadeTempo} onChange={(e) => mudarLinha(bloco.id, i, 'unidadeTempo', e.target.value)}>
                        <option value="diaria">diária</option>
                        <option value="hora">hora</option>
                      </select>
                    </label>
                    <label className="campo mini">
                      <span>Valor (R$)</span>
                      <input type="text" inputMode="decimal" value={l.valorUnit} placeholder="60,00"
                        onChange={(e) => mudarLinha(bloco.id, i, 'valorUnit', e.target.value)} />
                    </label>
                    <div className="linha-total">{moeda(totalLinhaTrabalho(l))}</div>
                    <button type="button" className="remover" onClick={() => removerLinha(bloco.id, i)} aria-label="Remover linha">✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="linhas">
                {linhas.map((l, i) => (
                  <div className="linha-custo" key={i}>
                    <label className="campo">
                      <span className="visually-hidden">Descrição</span>
                      <input
                        type="text"
                        value={l.desc}
                        onChange={(e) => mudarLinha(bloco.id, i, 'desc', e.target.value)}
                        placeholder="O que é? (ex.: combustível)"
                      />
                    </label>
                    <label className="campo mini">
                      <span className="visually-hidden">Valor em reais</span>
                      <div className="moeda-input">
                        <span aria-hidden="true">R$</span>
                        <input type="text" inputMode="decimal" value={l.valor} placeholder="0,00"
                          onChange={(e) => mudarLinha(bloco.id, i, 'valor', e.target.value)} />
                      </div>
                    </label>
                    <button type="button" className="remover" onClick={() => removerLinha(bloco.id, i)} aria-label="Remover linha">✕</button>
                  </div>
                ))}
              </div>
            )}

            <button type="button" className="add-linha" onClick={() => addLinha(bloco)}>
              + adicionar linha
            </button>
          </details>
        );
      })}

      <div className="totalizador">
        <span>Custos até aqui</span>
        <strong>{moeda(resultado.basicos + resultado.trabalho + resultado.logistica)}</strong>
      </div>
    </>
  );
}

/* ---------- Etapa: perdas (produto) ---------- */

function EtapaPerdas({ estado, mudar, resultado }) {
  const modo = estado.perda.modo;
  return (
    <>
      <h2 className="etapa-titulo">Perdas no caminho</h2>
      <p className="etapa-explica">
        Na Amazônia sempre se perde um pouco: fruta que estraga, peixe que não chega, umidade,
        quebra no transporte. Quem não cobra as perdas, paga por elas.
      </p>

      <div className="seletor-modo" role="radiogroup" aria-label="Como informar as perdas">
        <button type="button" role="radio" aria-checked={modo === 'pct'}
          className={modo === 'pct' ? 'modo ativo' : 'modo'}
          onClick={() => mudar('perda.modo', 'pct')}>
          Em % do custo
        </button>
        <button type="button" role="radio" aria-checked={modo === 'valor'}
          className={modo === 'valor' ? 'modo ativo' : 'modo'}
          onClick={() => mudar('perda.modo', 'valor')}>
          Em reais (R$)
        </button>
      </div>

      {modo === 'pct' ? (
        <label className="campo campo-destaque">
          <span>Quanto se perde, em média?</span>
          <div className="sufixo-input">
            <input type="text" inputMode="decimal" value={estado.perda.pct}
              onChange={(e) => mudar('perda.pct', e.target.value)} placeholder="Ex.: 10" />
            <span aria-hidden="true">%</span>
          </div>
          <small>Por exemplo: de cada 10 caixas, 1 se perde = 10%.</small>
        </label>
      ) : (
        <label className="campo campo-destaque">
          <span>Valor das perdas neste lote</span>
          <div className="moeda-input grande">
            <span aria-hidden="true">R$</span>
            <input type="text" inputMode="decimal" value={estado.perda.valor}
              onChange={(e) => mudar('perda.valor', e.target.value)} placeholder="0,00" />
          </div>
        </label>
      )}

      <div className="totalizador">
        <span>Custo das perdas</span>
        <strong>{moeda(resultado.perdas)}</strong>
      </div>
    </>
  );
}

/* ---------- Etapa: fundo comunitário + reinvestimento ---------- */

function EtapaColetivo({ estado, mudar, resultado }) {
  const presets = ['0', '5', '10', '15'];
  return (
    <>
      <h2 className="etapa-titulo">Fundo comunitário e futuro</h2>
      <p className="etapa-explica">
        Uma parte do preço fortalece o coletivo (associação, fundo rotativo) e outra garante que a
        atividade continue: consertar motor, repor ferramenta, crescer.
      </p>

      <div className="cartao-coletivo">
        <h3>Fundo comunitário</h3>
        <p>Contribuição para a associação ou fundo coletivo.</p>
        <div className="chips">
          {presets.map((p) => (
            <button key={p} type="button"
              className={estado.fundoPct === p ? 'chip ativo' : 'chip'}
              onClick={() => mudar('fundoPct', p)}>
              {p}%
            </button>
          ))}
          <div className="sufixo-input chip-input">
            <input type="text" inputMode="decimal" value={estado.fundoPct}
              onChange={(e) => mudar('fundoPct', e.target.value)} aria-label="Percentual do fundo comunitário" />
            <span aria-hidden="true">%</span>
          </div>
        </div>
        <small>= {moeda(resultado.fundo)}</small>
      </div>

      <div className="cartao-coletivo">
        <h3>Margem de reinvestimento</h3>
        <p>Reserva para manutenção, melhoria e expansão da atividade.</p>
        <div className="chips">
          {presets.map((p) => (
            <button key={p} type="button"
              className={estado.reinvestPct === p ? 'chip ativo' : 'chip'}
              onClick={() => mudar('reinvestPct', p)}>
              {p}%
            </button>
          ))}
          <div className="sufixo-input chip-input">
            <input type="text" inputMode="decimal" value={estado.reinvestPct}
              onChange={(e) => mudar('reinvestPct', e.target.value)} aria-label="Percentual de reinvestimento" />
            <span aria-hidden="true">%</span>
          </div>
        </div>
        <small>= {moeda(resultado.reinvest)}</small>
      </div>
    </>
  );
}

/* ---------- Etapa: referências externas ---------- */

function EtapaReferencias({ estado, setEstado }) {
  function add() {
    setEstado((e) => ({
      ...e,
      referencias: [...e.referencias, { tipo: 'atravessador', fonte: '', valor: '' }],
    }));
  }
  function mudarRef(i, campo, valor) {
    setEstado((e) => {
      const novo = structuredClone(e);
      novo.referencias[i][campo] = valor;
      return novo;
    });
  }
  function remover(i) {
    setEstado((e) => {
      const novo = structuredClone(e);
      novo.referencias.splice(i, 1);
      return novo;
    });
  }

  return (
    <>
      <h2 className="etapa-titulo">Com o que vamos comparar?</h2>
      <p className="etapa-explica">
        Anote quanto pagam hoje pelo seu {estado.tipo === 'servico' ? 'serviço' : 'produto'}:
        atravessador, feira, mercado, comprador direto e <b>políticas públicas</b> (PAA, PNAE,
        preço mínimo da Conab). Essa parte é opcional, mas ajuda muito na negociação.
      </p>

      {estado.referencias.length === 0 && (
        <div className="vazio-refs">
          <p>Nenhuma referência ainda.</p>
        </div>
      )}

      <div className="linhas">
        {estado.referencias.map((r, i) => (
          <div className="linha-ref" key={i}>
            <label className="campo">
              <span>Quem paga</span>
              <select value={r.tipo} onChange={(e) => mudarRef(i, 'tipo', e.target.value)}>
                {TIPOS_REFERENCIA.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Detalhe (opcional)</span>
              <input type="text" value={r.fonte} placeholder="Ex.: PNAE da prefeitura, feira de sábado…"
                onChange={(e) => mudarRef(i, 'fonte', e.target.value)} />
            </label>
            <label className="campo mini">
              <span>Preço por {estado.item.unidade || 'unidade'}</span>
              <div className="moeda-input">
                <span aria-hidden="true">R$</span>
                <input type="text" inputMode="decimal" value={r.valor} placeholder="0,00"
                  onChange={(e) => mudarRef(i, 'valor', e.target.value)} />
              </div>
            </label>
            <button type="button" className="remover" onClick={() => remover(i)} aria-label="Remover referência">✕</button>
          </div>
        ))}
      </div>

      <button type="button" className="add-linha" onClick={add}>+ adicionar referência de preço</button>
    </>
  );
}
