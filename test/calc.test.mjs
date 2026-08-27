// Valida o motor de cálculo contra os dois exemplos do documento de requisitos.
import assert from 'node:assert/strict';
import { estadoInicial, calcular } from '../src/calc.js';

function aprox(a, b, msg) {
  assert.ok(Math.abs(a - b) < 0.005, `${msg}: esperado ${b}, obtido ${a}`);
}

// --- Exemplo 1 (seção 10): 100 kg de farinha → preço final R$ 9,66/kg ---
{
  const e = estadoInicial('produto');
  e.item.nome = 'Farinha de mandioca';
  e.item.quantidadeVendavel = '100';
  e.custos.insumos = [{ desc: 'insumos', valor: '120' }];
  e.custos.trabalho = [{ desc: 'trabalho', pessoas: '1', tempo: '1', unidadeTempo: 'diaria', valorUnit: '300' }];
  e.custos.logistica = [{ desc: 'transporte', valor: '150' }];
  e.custos.beneficiamento = [{ desc: 'beneficiamento', valor: '100' }];
  e.custos.embalagem = [{ desc: 'embalagem', valor: '80' }];
  e.custos.fixos = [{ desc: 'fixos rateados', valor: '40' }];
  e.perda = { modo: 'valor', pct: '', valor: '50' };
  e.fundoPct = '5';
  e.reinvestPct = '10';

  const r = calcular(e);
  aprox(r.subtotal, 840, 'subtotal farinha');
  aprox(r.fundo, 42, 'fundo 5%');
  aprox(r.reinvest, 84, 'reinvestimento 10%');
  aprox(r.custoTotal, 966, 'total farinha');
  aprox(r.precoSustentavel, 9.66, 'preço sustentável farinha');
  aprox(r.precoJusto, 8.82, 'preço justo farinha');
  aprox(r.precoMinimo, 6.4, 'preço mínimo farinha');
  aprox(r.precoCusto, 3.4, 'preço de custo farinha');

  // comparações da seção 10
  e.referencias = [
    { tipo: 'atravessador', fonte: '', valor: '7,50' },
    { tipo: 'feira', fonte: '', valor: '9,00' },
    { tipo: 'politica_publica', fonte: 'PAA', valor: '10,00' },
  ];
  const r2 = calcular(e);
  assert.equal(r2.referencias[0].nivel, 'abaixo-justo', 'atravessador 7,50 paga trabalho mas fica abaixo do justo');
  assert.equal(r2.referencias[1].nivel, 'quase', 'feira 9,00 perto do justo, sem reinvestimento');
  assert.equal(r2.referencias[2].nivel, 'sustentavel', 'política pública 10,00 é sustentável');
}

// --- Exemplo 2 (seção 11): guiamento de 1 dia → preço final R$ 300 ---
{
  const e = estadoInicial('servico');
  e.item.nome = 'Guiamento comunitário (1 dia)';
  e.custos.trabalho = [{ desc: 'guias', pessoas: '2', tempo: '1', unidadeTempo: 'diaria', valorUnit: '60' }];
  e.custos.logistica = [{ desc: 'combustível', valor: '70' }];
  e.custos.alimentacao = [{ desc: 'alimentação', valor: '30' }];
  e.custos.materiais = [{ desc: 'materiais', valor: '20' }];
  e.custos.fixos = [{ desc: 'manutenção de equipamento', valor: '10' }];
  e.fundoPct = '10';
  e.reinvestPct = '10';

  const r = calcular(e);
  aprox(r.subtotal, 250, 'subtotal guiamento');
  aprox(r.custoTotal, 300, 'preço final guiamento');
  aprox(r.precoSustentavel, 300, 'preço sustentável guiamento');
}

// --- Margem de contribuição e alerta de custos fixos ---
{
  const e = estadoInicial('produto');
  e.item.nome = 'Farinha de mandioca';
  e.item.quantidadeVendavel = '100';
  e.custos.insumos = [{ desc: 'insumos', valor: '120' }];
  e.custos.trabalho = [{ desc: 'trabalho', pessoas: '1', tempo: '1', unidadeTempo: 'diaria', valorUnit: '300' }];
  e.custos.logistica = [{ desc: 'transporte', valor: '150' }];
  e.custos.beneficiamento = [{ desc: 'beneficiamento', valor: '100' }];
  e.custos.embalagem = [{ desc: 'embalagem', valor: '80' }];
  e.custos.fixos = [{ desc: 'fixos rateados', valor: '40' }];
  e.perda = { modo: 'valor', pct: '', valor: '50' };
  e.precoVenda = '10,00';

  const r = calcular(e);
  // custos variáveis = subtotal (840) − fixos (40) = 800 → R$ 8,00/kg
  aprox(r.custoVariavelUnit, 8.0, 'custo variável unitário');
  aprox(r.margem.mc, 2.0, 'margem de contribuição unitária (PV 10,00)');
  aprox(r.margem.mcPct, 0.2, 'margem de contribuição % (20%)');
  assert.equal(r.margem.unidadesParaFixos, 20, '20 kg cobrem os R$ 40 de fixos');
  aprox(r.fixosPct, 40 / 966, 'participação dos fixos no preço');
  assert.equal(r.alertaFixos, false, 'fixos de 4,1% não disparam alerta');

  // composição soma 100%: subtotal + fundo + reinvest = custoTotal
  aprox(r.subtotal + r.fundo + r.reinvest, r.custoTotal, 'composição fecha em 100%');

  // preço de venda abaixo do custo variável → margem negativa
  e.precoVenda = '7';
  const r2 = calcular(e);
  assert.ok(r2.margem.mc < 0, 'PV 7,00 gera margem negativa');

  // custos fixos estourados (> 30% do total) → alerta
  e.custos.fixos = [{ desc: 'fixos pesados', valor: '600' }];
  const r3 = calcular(e);
  assert.ok(r3.fixosPct > 0.3, 'fixos altos passam de 30%');
  assert.equal(r3.alertaFixos, true, 'alerta de custo fixo dispara');
}

// --- Imposto sobre a venda (ISS) entra "por dentro" do preço ---
{
  const e = estadoInicial('servico');
  e.item.nome = 'Guiamento comunitário (1 dia)';
  e.custos.trabalho = [{ desc: 'guias', pessoas: '2', tempo: '1', unidadeTempo: 'diaria', valorUnit: '60' }];
  e.custos.logistica = [{ desc: 'combustível', valor: '70' }];
  e.custos.alimentacao = [{ desc: 'alimentação', valor: '30' }];
  e.custos.materiais = [{ desc: 'materiais', valor: '20' }];
  e.custos.fixos = [{ desc: 'manutenção de equipamento', valor: '10' }];
  e.fundoPct = '10';
  e.reinvestPct = '10';

  // sem imposto: idêntico ao exemplo do documento (nenhuma regressão)
  aprox(calcular(e).precoSustentavel, 300, 'sem imposto o preço não muda');

  // ISS de 5%: preço = 300 / (1 − 0,05) = 315,79 — e não 315,00.
  // Conferência: 5% de 315,79 = 15,79, sobrando exatamente os 300 de custo.
  e.impostoPct = '5';
  const r = calcular(e);
  aprox(r.precoSustentavel, 315.7895, 'preço com ISS 5% por dentro');
  aprox(r.imposto, 15.7895, 'valor do imposto');
  aprox(r.totalComImposto - r.imposto, 300, 'depois do imposto sobram os custos');
  aprox(r.precoSustentavel * r.aliquota, r.imposto, 'imposto confere sobre o preço de venda');

  // o imposto também pesa na margem de contribuição
  e.precoVenda = '315,79';
  const rm = calcular(e);
  aprox(rm.margem.mc, 315.79 - 240 - 315.79 * 0.05, 'margem desconta o imposto da venda');
}

// --- Serviço agora aceita quantidade (ex.: 3 diárias no mesmo orçamento) ---
{
  const e = estadoInicial('servico');
  e.item.nome = 'Guiamento comunitário';
  e.item.unidade = 'dia';
  e.item.quantidadeVendavel = '3';
  // custos das 3 diárias somados
  e.custos.trabalho = [{ desc: 'guias', pessoas: '2', tempo: '3', unidadeTempo: 'diaria', valorUnit: '60' }];
  e.custos.logistica = [{ desc: 'combustível', valor: '210' }];
  e.custos.alimentacao = [{ desc: 'alimentação', valor: '90' }];
  e.custos.materiais = [{ desc: 'materiais', valor: '60' }];
  e.custos.fixos = [{ desc: 'manutenção', valor: '30' }];
  e.fundoPct = '10';
  e.reinvestPct = '10';

  const r = calcular(e);
  assert.equal(r.quantidade, 3, 'serviço respeita a quantidade informada');
  aprox(r.custoTotal, 900, 'custo das 3 diárias');
  aprox(r.precoSustentavel, 300, 'preço por diária continua R$ 300');

  // vazio segue valendo 1 (comportamento antigo preservado)
  e.item.quantidadeVendavel = '';
  assert.equal(calcular(e).quantidade, 1, 'serviço sem quantidade = 1');
}

// --- parser de números pt-BR ---
{
  const { parseNum } = await import('../src/calc.js');
  assert.equal(parseNum('1.234,56'), 1234.56);
  assert.equal(parseNum('1234,5'), 1234.5);
  assert.equal(parseNum('1234.56'), 1234.56);
  assert.equal(parseNum('R$ 10'), 10);
  assert.equal(parseNum(''), 0);
  assert.equal(parseNum('abc'), 0);
}

console.log('✓ Todos os testes passaram (exemplos do documento conferem).');
