import { useState } from 'react';
import { entrarComGoogle } from '../firebase.js';

export default function Login({ aoExperimentar }) {
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro('');
    setCarregando(true);
    try {
      await entrarComGoogle();
    } catch (e) {
      setErro(
        e.code === 'auth/network-request-failed'
          ? 'Sem conexão. Tente novamente quando a internet voltar.'
          : 'Não foi possível entrar agora. Tente de novo em instantes.'
      );
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-login">
      <div className="login-cartao">
        <div className="login-selo" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="72" height="72">
            <circle cx="32" cy="32" r="30" fill="var(--verde-900)" />
            <path
              d="M32 12c-9 7-14 15-14 24 0 8 6 14 14 16 8-2 14-8 14-16 0-9-5-17-14-24zm0 8c5 5 8 11 8 16 0 5-3 9-8 11-5-2-8-6-8-11 0-5 3-11 8-16z"
              fill="var(--ambar-500)"
            />
          </svg>
        </div>

        <h1>
          Preço <em>Justo</em>
          <span className="login-sub">Calculadora da sociobiodiversidade amazônica</span>
        </h1>

        <p className="login-texto">
          Calcule quanto vale de verdade o seu produto ou serviço: custos, trabalho, transporte,
          perdas, fundo comunitário e margem para o futuro — e compare com atravessador, feira e
          políticas públicas.
        </p>

        <button className="botao-google" onClick={entrar} disabled={carregando}>
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          {carregando ? 'Abrindo…' : 'Entrar com Google'}
        </button>

        {erro && <p className="login-erro" role="alert">{erro}</p>}

        <button className="botao terciario" onClick={aoExperimentar}>
          Experimentar sem entrar →
        </button>
        <p className="login-aviso">Sem login dá para calcular, mas o histórico não fica salvo.</p>

        <ul className="login-passos">
          <li><b>1.</b> Diga o que vai vender</li>
          <li><b>2.</b> Anote os custos e o trabalho</li>
          <li><b>3.</b> Veja o preço justo e negocie melhor</li>
        </ul>
      </div>
    </div>
  );
}
