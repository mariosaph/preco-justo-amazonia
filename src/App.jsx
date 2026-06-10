import { useEffect, useState } from 'react';
import { aoMudarUsuario, sair } from './firebase.js';
import Login from './components/Login.jsx';
import Wizard from './components/Wizard.jsx';
import Historico from './components/Historico.jsx';
import { estadoInicial } from './calc.js';

export default function App() {
  const [usuario, setUsuario] = useState(undefined); // undefined = carregando
  const [aba, setAba] = useState('calculadora');
  const [estadoCarregado, setEstadoCarregado] = useState(null);

  useEffect(() => aoMudarUsuario(setUsuario), []);

  function reabrirCalculo(dados) {
    setEstadoCarregado({ ...estadoInicial(dados.tipo), ...dados });
    setAba('calculadora');
  }

  if (usuario === undefined) {
    return (
      <div className="tela-carregando">
        <div className="folha-pulso" aria-hidden="true">✦</div>
        <p>Abrindo a calculadora…</p>
      </div>
    );
  }

  if (!usuario) return <Login />;

  return (
    <div className="app">
      <header className="cabecalho no-print">
        <div className="marca">
          <span className="marca-glifo" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="30" height="30">
              <circle cx="32" cy="32" r="30" fill="var(--verde-900)" />
              <path
                d="M32 12c-9 7-14 15-14 24 0 8 6 14 14 16 8-2 14-8 14-16 0-9-5-17-14-24zm0 8c5 5 8 11 8 16 0 5-3 9-8 11-5-2-8-6-8-11 0-5 3-11 8-16z"
                fill="var(--ambar-500)"
              />
            </svg>
          </span>
          <span className="marca-texto">
            <strong>Preço Justo</strong>
            <small>Amazônia</small>
          </span>
        </div>

        <nav className="abas" aria-label="Seções">
          <button
            className={aba === 'calculadora' ? 'aba ativa' : 'aba'}
            onClick={() => setAba('calculadora')}
          >
            Calculadora
          </button>
          <button
            className={aba === 'historico' ? 'aba ativa' : 'aba'}
            onClick={() => setAba('historico')}
          >
            Histórico
          </button>
        </nav>

        <div className="usuario">
          {usuario.photoURL && <img src={usuario.photoURL} alt="" referrerPolicy="no-referrer" />}
          <div className="usuario-info">
            <span title={usuario.email}>{(usuario.displayName || usuario.email || '').split(' ')[0]}</span>
            <button className="link-sair" onClick={sair}>sair</button>
          </div>
        </div>
      </header>

      <main className="conteudo">
        {aba === 'calculadora' ? (
          <Wizard
            usuario={usuario}
            estadoExterno={estadoCarregado}
            aoConsumirEstadoExterno={() => setEstadoCarregado(null)}
          />
        ) : (
          <Historico usuario={usuario} aoReabrir={reabrirCalculo} />
        )}
      </main>

      <footer className="rodape no-print">
        <p>
          Ferramenta de apoio à formação de preços justos para produtos e serviços das comunidades
          tradicionais da Amazônia — custos reais, trabalho, logística, perdas e fundo comunitário.
        </p>
      </footer>
    </div>
  );
}
