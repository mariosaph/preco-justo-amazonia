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
