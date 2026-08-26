import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCpCzSYVX9hm-TBU9l56XVY6kfzg3hVlvk',
  authDomain: 'preco-justo-ia.firebaseapp.com',
  projectId: 'preco-justo-amazonia',
  storageBucket: 'preco-justo-amazonia.firebasestorage.app',
  messagingSenderId: '738418855873',
  appId: '1:738418855873:web:20ee6350cfdc098c006940',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Cache local persistente: o histórico continua acessível offline e as
// gravações são sincronizadas quando a conexão volta — essencial para o
// contexto amazônico de conectividade intermitente.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

const provider = new GoogleAuthProvider();

export async function entrarComGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      throw e;
    }
  }
}

export function sair() {
  return signOut(auth);
}

export function aoMudarUsuario(cb) {
  return onAuthStateChanged(auth, cb);
}

function colecaoCalculos(uid) {
  return collection(db, 'usuarios', uid, 'calculos');
}

// Planilha viva ligada à plataforma (Apps Script Web App vinculado à Google
// Sheets de respostas). Vazio = desligado; preencher com a URL /exec depois de
// publicar apps-script/Code.gs. POST text/plain para evitar preflight CORS.
const SHEET_ENDPOINT = '';

function espelharNaPlanilha(uid, dados, resultado) {
  if (!SHEET_ENDPOINT) return;
  try {
    const u = auth.currentUser || {};
    const payload = {
      uid,
      nome: u.displayName || '',
      email: u.email || '',
      item: dados.item.nome || (dados.tipo === 'servico' ? 'Serviço sem nome' : 'Produto sem nome'),
      tipo: dados.tipo,
      unidade: dados.item.unidade || '',
      quantidade: resultado.quantidade,
      precoCusto: resultado.precoCusto,
      precoMinimo: resultado.precoMinimo,
      precoJusto: resultado.precoJusto,
      precoSustentavel: resultado.precoSustentavel,
      custoTotal: resultado.custoTotal,
      comunidade: dados.comunidade.nome || '',
      municipio: dados.comunidade.municipio || '',
      estado: dados.comunidade.estado || '',
      precoAtual: (dados.precoAtual != null ? dados.precoAtual : ''),
    };
    // fire-and-forget: nunca bloqueia nem quebra o salvamento no Firestore
    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {
    /* espelho é best-effort */
  }
}

export async function salvarCalculo(uid, dados, resultado) {
  const ref = await addDoc(colecaoCalculos(uid), {
    criadoEm: serverTimestamp(),
    tipo: dados.tipo,
    nomeItem: dados.item.nome || (dados.tipo === 'servico' ? 'Serviço sem nome' : 'Produto sem nome'),
    unidade: dados.item.unidade || '',
    comunidade: dados.comunidade.nome || '',
    dados,
    resumo: {
      custoTotal: resultado.custoTotal,
      precoCusto: resultado.precoCusto,
      precoMinimo: resultado.precoMinimo,
      precoJusto: resultado.precoJusto,
      precoSustentavel: resultado.precoSustentavel,
      quantidade: resultado.quantidade,
    },
  });
  espelharNaPlanilha(uid, dados, resultado);
  return ref.id;
}

export function observarHistorico(uid, cb) {
  const q = query(colecaoCalculos(uid), orderBy('criadoEm', 'desc'), limit(100));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function excluirCalculo(uid, id) {
  return deleteDoc(doc(db, 'usuarios', uid, 'calculos', id));
}
