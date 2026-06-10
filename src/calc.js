// Motor de cálculo — fórmulas da seção 9 do documento de requisitos.
//
// Preço de custo      = custos básicos (insumos, beneficiamento, embalagem,
//                       alimentação, materiais, fixos rateados)
// Preço mínimo        = custo + trabalho
// Preço justo         = mínimo + logística + perdas + fundo comunitário
// Preço sustentável   = justo + margem de reinvestimento
//
// Fundo e reinvestimento incidem sobre o subtotal completo (incluindo perdas),
// como no exemplo da farinha do documento (R$ 840 → 5% = R$ 42, 10% = R$ 84).

export const BLOCOS_PRODUTO = [
  { id: 'insumos', titulo: 'Insumos e matéria-prima', dica: 'Sal, gelo, óleo, sementes, fibras, gás, energia…', grupo: 'basico' },
  { id: 'trabalho', titulo: 'Trabalho', dica: 'O tempo das pessoas vale dinheiro. Conte coleta, preparo, embalagem, venda.', grupo: 'trabalho' },
  { id: 'logistica', titulo: 'Transporte e logística', dica: 'Combustível, frete, rabeta ou barco, alimentação na viagem, carregamento.', grupo: 'logistica' },
  { id: 'beneficiamento', titulo: 'Beneficiamento', dica: 'Secagem, torra, moagem, defumação, limpeza, energia do processo.', grupo: 'basico' },
  { id: 'embalagem', titulo: 'Embalagem e etiqueta', dica: 'Saco, frasco, caixa, lacre, etiqueta, impressão.', grupo: 'basico' },
  { id: 'fixos', titulo: 'Custos fixos rateados', dica: 'Parte da manutenção de equipamentos, espaço, taxas da associação.', grupo: 'basico' },
];

export const BLOCOS_SERVICO = [
  { id: 'trabalho', titulo: 'Trabalho', dica: 'Quantas pessoas, por quanto tempo, a quanto vale a diária ou a hora.', grupo: 'trabalho' },
  { id: 'logistica', titulo: 'Deslocamento e combustível', dica: 'Gasolina, frete, aluguel de embarcação.', grupo: 'logistica' },
  { id: 'alimentacao', titulo: 'Alimentação', dica: 'Comida da equipe e dos visitantes, quando incluída.', grupo: 'basico' },
  { id: 'materiais', titulo: 'Materiais', dica: 'Material de oficina, equipamentos de segurança, insumos do serviço.', grupo: 'basico' },
  { id: 'fixos', titulo: 'Equipamentos e manutenção', dica: 'Desgaste de motor, canoa, ferramentas usadas no serviço.', grupo: 'basico' },
];

export function blocosPara(tipo) {
  return tipo === 'servico' ? BLOCOS_SERVICO : BLOCOS_PRODUTO;
}

export function novaLinhaCusto() {
  return { desc: '', valor: '' };
}

export function novaLinhaTrabalho() {
  return { desc: '', pessoas: '1', tempo: '1', unidadeTempo: 'diaria', valorUnit: '' };
}

export function estadoInicial(tipo = 'produto') {
  const custos = {};
  for (const b of blocosPara(tipo)) {
    custos[b.id] = b.grupo === 'trabalho' ? [novaLinhaTrabalho()] : [novaLinhaCusto()];
  }
  return {
    tipo,
    item: { nome: '', categoria: '', unidade: tipo === 'servico' ? 'serviço' : 'kg', quantidadeVendavel: '', duracao: '', pessoas: '' },
    comunidade: { nome: '', municipio: '', estado: 'AM', associacao: '' },
    custos,
    perda: { modo: 'pct', pct: '', valor: '' },
    fundoPct: '5',
    reinvestPct: '10',
    referencias: [],
  };
}

// Aceita "1.234,56", "1234,56", "1234.56", "1234" → número.
export function parseNum(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim().replace(/\s|R\$/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

export function totalLinhaTrabalho(l) {
  return parseNum(l.pessoas) * parseNum(l.tempo) * parseNum(l.valorUnit);
}

export function totalBloco(bloco, linhas) {
  if (!linhas) return 0;
  return linhas.reduce(
    (acc, l) => acc + (bloco.grupo === 'trabalho' ? totalLinhaTrabalho(l) : parseNum(l.valor)),
    0
  );
}

export function calcular(estado) {
  const blocos = blocosPara(estado.tipo);
  const porBloco = {};
  let basicos = 0;
  let trabalho = 0;
  let logistica = 0;

  for (const b of blocos) {
    const t = totalBloco(b, estado.custos[b.id]);
    porBloco[b.id] = t;
    if (b.grupo === 'trabalho') trabalho += t;
    else if (b.grupo === 'logistica') logistica += t;
    else basicos += t;
  }

  const subtotalBase = basicos + trabalho + logistica;
  const perdas =
    estado.perda.modo === 'valor'
      ? parseNum(estado.perda.valor)
      : subtotalBase * (parseNum(estado.perda.pct) / 100);
  const subtotal = subtotalBase + perdas;
  const fundo = subtotal * (parseNum(estado.fundoPct) / 100);
  const reinvest = subtotal * (parseNum(estado.reinvestPct) / 100);
  const custoTotal = subtotal + fundo + reinvest;

  const qtdBruta = estado.tipo === 'servico' ? 1 : parseNum(estado.item.quantidadeVendavel);
  const qtd = qtdBruta > 0 ? qtdBruta : 1;

  const precoCusto = basicos / qtd;
  const precoMinimo = (basicos + trabalho) / qtd;
  const precoJusto = (subtotal + fundo) / qtd;
  const precoSustentavel = custoTotal / qtd;

  const referencias = (estado.referencias || [])
    .filter((r) => parseNum(r.valor) > 0)
    .map((r) => {
      const v = parseNum(r.valor);
      let nivel, leitura;
      if (v < precoCusto) {
        nivel = 'prejuizo';
        leitura = 'Abaixo do custo: vender por esse valor dá prejuízo.';
      } else if (v < precoMinimo) {
        nivel = 'desvaloriza';
        leitura = 'Cobre os custos básicos, mas não paga o trabalho das pessoas.';
      } else if (v < precoJusto) {
        nivel = 'abaixo-justo';
        leitura = 'Paga custos e trabalho, mas não cobre logística, perdas e fundo comunitário.';
      } else if (v < precoSustentavel) {
        nivel = 'quase';
        leitura = 'Próximo do justo, mas sem margem para reinvestir na atividade.';
      } else {
        nivel = 'sustentavel';
        leitura = 'Igual ou acima do preço sustentável: fortalece a atividade.';
      }
      return { ...r, valorNum: v, diferenca: v - precoSustentavel, nivel, leitura };
    });

  return {
    porBloco,
    basicos,
    trabalho,
    logistica,
    perdas,
    subtotal,
    fundo,
    reinvest,
    custoTotal,
    quantidade: qtd,
    precoCusto,
    precoMinimo,
    precoJusto,
    precoSustentavel,
    referencias,
  };
}

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function moeda(n) {
  return fmtBRL.format(isFinite(n) ? n : 0);
}

export const TIPOS_REFERENCIA = [
  { id: 'atravessador', rotulo: 'Atravessador' },
  { id: 'feira', rotulo: 'Feira local' },
  { id: 'mercado', rotulo: 'Mercado / comércio' },
  { id: 'politica_publica', rotulo: 'Política pública (PAA, PNAE, PGPM-Bio…)' },
  { id: 'comprador', rotulo: 'Comprador direto' },
  { id: 'comunidade', rotulo: 'Preço praticado na comunidade' },
  { id: 'outro', rotulo: 'Outra referência' },
];
