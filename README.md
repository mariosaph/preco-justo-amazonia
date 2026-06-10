# Preço Justo Amazônia 🌿

Calculadora web de **precificação justa para produtos e serviços da sociobiodiversidade
amazônica** — farinha, peixe, castanha, mel, artesanato, guiamento, hospedagem comunitária e
muito mais.

Construída a partir da especificação *"Aplicativo para precificação de produtos da
sociobiodiversidade"*: a ferramenta apoia comunidades tradicionais na formação de preços que
cobrem custos reais, valorizam o trabalho, consideram a logística fluvial, as perdas e a
sazonalidade, e ainda fortalecem o coletivo.

## O que a calculadora faz

- **Produtos e serviços** com blocos de custo adaptados a cada caso (insumos, trabalho,
  logística, beneficiamento, embalagem, custos fixos rateados, alimentação, materiais);
- **Trabalho como custo**: pessoas × diárias/horas × valor de referência;
- **Perdas** em percentual ou em reais;
- **Fundo comunitário** e **margem de reinvestimento** configuráveis;
- **Quatro preços de saída** (seção 7 da especificação):
  1. *Preço de custo* — cobre os custos básicos;
  2. *Preço mínimo* — custos + trabalho;
  3. *Preço justo* — + logística, perdas e fundo comunitário;
  4. *Preço sustentável* — + margem de reinvestimento;
- **Comparação com referências externas**: atravessador, feira, mercado, comprador direto e
  políticas públicas (PAA, PNAE, PGPM-Bio), com leitura em linguagem simples;
- **Histórico por usuário** (login Google + Cloud Firestore, com cache offline);
- **Ficha de precificação imprimível** (PDF via imprimir) para negociação com compradores;
- Interface **responsiva** e acessível (fonte Atkinson Hyperlegible, alvos de toque grandes,
  linguagem direta).

## Fórmulas (seção 9 da especificação)

```
subtotal       = custos básicos + trabalho + logística + perdas
fundo          = subtotal × % fundo comunitário
reinvestimento = subtotal × % reinvestimento
preço final    = (subtotal + fundo + reinvestimento) ÷ quantidade vendável
```

Os exemplos do documento são verificados por teste automatizado
(`npm test`): farinha 100 kg → **R$ 9,66/kg**; guiamento de 1 dia → **R$ 300**.

## Stack

- [Vite](https://vitejs.dev/) + React 18
- Firebase Authentication (Google) + Cloud Firestore (cache local persistente → funciona com
  conexão intermitente)
- CSS artesanal, sem framework — tema "almanaque da floresta"
- Deploy: Netlify

## Rodando localmente

```bash
npm install
npm run dev    # http://localhost:5173
npm test       # valida o motor de cálculo contra os exemplos da especificação
npm run build  # gera dist/
```

## Segurança dos dados

Regras do Firestore (`firestore.rules`): cada usuário autenticado lê e escreve **apenas** o
próprio histórico (`usuarios/{uid}/calculos`).

## Estrutura

```
src/
  calc.js            ← motor de cálculo puro (testável)
  firebase.js        ← auth + Firestore
  App.jsx            ← shell, navegação, sessão
  components/
    Login.jsx        ← entrada com Google
    Wizard.jsx       ← fluxo em etapas (item → custos → perdas → fundo → referências)
    Resultado.jsx    ← escada de preços, composição, comparações, ficha imprimível
    Historico.jsx    ← cálculos salvos do usuário
test/calc.test.mjs   ← exemplos da especificação como casos de teste
```
