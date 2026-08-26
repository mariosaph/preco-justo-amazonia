/**
 * Preço Justo Amazônia — coletor de respostas na planilha
 * Web App vinculado à planilha
 *   https://docs.google.com/spreadsheets/d/1FK0s77dOrFGtn7HvWsP8icVutJYR2K5pf0rhF06ig9M/edit
 *
 * O app (preco-justo-ia.web.app) faz POST (text/plain, sem preflight) a cada
 * cálculo salvo; aqui gravamos uma linha na aba "Coleta ao vivo".
 *
 * PUBLICAR (uma vez, ~2 min): Extensões → Apps Script → colar este arquivo →
 * Implantar → Nova implantação → Tipo "App da Web" → Executar como "Eu" →
 * Quem tem acesso "Qualquer pessoa" → Implantar → copiar a URL /exec e me mandar.
 */

var SHEET_ID = '1FK0s77dOrFGtn7HvWsP8icVutJYR2K5pf0rhF06ig9M';
var ABA = 'Coleta ao vivo';
var CABECALHO = [
  'Quando (Manaus)', 'Nome', 'E-mail', 'Item', 'Tipo', 'Unidade', 'Quantidade',
  'Preço custo', 'Preço mínimo', 'Preço justo', 'Preço sustentável', 'Custo total',
  'Comunidade', 'Município', 'Estado', 'Preço atual', 'uid'
];

function aba_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(ABA);
  if (!sh) {
    sh = ss.insertSheet(ABA, 0);
    sh.appendRow(CABECALHO);
    sh.getRange(1, 1, 1, CABECALHO.length).setFontWeight('bold')
      .setBackground('#053a26').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var agora = Utilities.formatDate(new Date(), 'America/Manaus', 'yyyy-MM-dd HH:mm:ss');
    aba_().appendRow([
      agora, d.nome || '', d.email || '', d.item || '', d.tipo || '', d.unidade || '',
      d.quantidade || '', d.precoCusto || '', d.precoMinimo || '', d.precoJusto || '',
      d.precoSustentavel || '', d.custoTotal || '', d.comunidade || '', d.municipio || '',
      d.estado || '', d.precoAtual || '', d.uid || ''
    ]);
    return ContentService.createTextOutput('1').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('erro:' + err).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet() {
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}
