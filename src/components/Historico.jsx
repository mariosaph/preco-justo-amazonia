import { useEffect, useState } from 'react';
import { observarHistorico, excluirCalculo } from '../firebase.js';
import { moeda } from '../calc.js';

export default function Historico({ usuario, aoReabrir }) {
  const [itens, setItens] = useState(null);
  const [confirmando, setConfirmando] = useState(null);

  useEffect(() => observarHistorico(usuario.uid, setItens), [usuario.uid]);

  if (itens === null) {
    return <div className="painel"><p className="carregando-texto">Carregando histórico…</p></div>;
  }

  if (itens.length === 0) {
    return (
      <div className="painel vazio-historico">
        <div className="vazio-arte" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r="30" fill="var(--verde-100)" />
            <path d="M32 12c-9 7-14 15-14 24 0 8 6 14 14 16 8-2 14-8 14-16 0-9-5-17-14-24zm0 8c5 5 8 11 8 16 0 5-3 9-8 11-5-2-8-6-8-11 0-5 3-11 8-16z" fill="var(--verde-700)" />
          </svg>
        </div>
        <h2>Seu histórico começa aqui</h2>
        <p>
          Cada cálculo salvo aparece nesta lista — assim a comunidade acompanha como o preço mudou
          com o tempo, a cheia e a seca.
        </p>
      </div>
    );
  }

  return (
    <div className="painel">
      <h2 className="etapa-titulo">Histórico de cálculos</h2>
      <p className="etapa-explica">Toque em um cálculo para reabrir a ficha completa.</p>
      <ul className="lista-historico">
        {itens.map((c) => (
          <li key={c.id} className="cartao-historico">
            <button type="button" className="historico-corpo" onClick={() => aoReabrir(c.dados)}>
              <div className="historico-topo">
                <span className={`selo-tipo ${c.tipo}`}>{c.tipo === 'servico' ? 'Serviço' : 'Produto'}</span>
                <span className="historico-data">
                  {c.criadoEm?.toDate ? c.criadoEm.toDate().toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
              <strong className="historico-nome">{c.nomeItem}</strong>
              {c.comunidade && <small className="historico-comunidade">{c.comunidade}</small>}
              <div className="historico-precos">
                <span><small>justo</small> {moeda(c.resumo?.precoJusto ?? 0)}</span>
                <span className="preco-sust"><small>sustentável</small> {moeda(c.resumo?.precoSustentavel ?? 0)}</span>
                {c.unidade && <small className="por-unidade">por {c.unidade}</small>}
              </div>
            </button>
            {confirmando === c.id ? (
              <div className="confirmar-exclusao">
                <span>Excluir?</span>
                <button className="botao perigo mini-botao" onClick={() => { excluirCalculo(usuario.uid, c.id); setConfirmando(null); }}>Sim</button>
                <button className="botao terciario mini-botao" onClick={() => setConfirmando(null)}>Não</button>
              </div>
            ) : (
              <button type="button" className="remover" aria-label={`Excluir ${c.nomeItem}`} onClick={() => setConfirmando(c.id)}>✕</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
