import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
const backupDir = path.join(root, `backups_sprint3_1_3_node_fix_${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });

function abs(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  return fs.readFileSync(abs(rel), "utf8").replace(/^\uFEFF/, "");
}

function write(rel, content) {
  fs.writeFileSync(abs(rel), content.replace(/^\uFEFF/, ""), "utf8");
}

function backup(rel) {
  if (!exists(rel)) return;
  fs.copyFileSync(abs(rel), path.join(backupDir, rel.replace(/[\\/:]/g, "_")));
}

function walk(dir, exts, out = []) {
  if (!exists(dir)) return out;

  for (const item of fs.readdirSync(abs(dir), { withFileTypes: true })) {
    if (item.name === "node_modules" || item.name === "dist" || item.name.startsWith(".")) continue;

    const rel = path.join(dir, item.name);

    if (item.isDirectory()) {
      walk(rel, exts, out);
    } else if (exts.includes(path.extname(item.name))) {
      out.push(rel);
    }
  }

  return out;
}

const replacements = [
  ["OrÃ§amentos", "Orçamentos"],
  ["orÃ§amento", "orçamento"],
  ["OrÃ§amento", "Orçamento"],
  ["ORÃ‡AMENTO", "ORÇAMENTO"],
  ["OR�AMENTO", "ORÇAMENTO"],

  ["ServiÃ§os", "Serviços"],
  ["serviÃ§os", "serviços"],
  ["ServiÃ§o", "Serviço"],
  ["serviÃ§o", "serviço"],
  ["Servi�os", "Serviços"],
  ["servi�os", "serviços"],

  ["ConfiguraÃ§Ãµes", "Configurações"],
  ["configuraÃ§Ãµes", "configurações"],
  ["Configura��es", "Configurações"],
  ["configura��es", "configurações"],

  ["DescriÃ§Ã£o", "Descrição"],
  ["descriÃ§Ã£o", "descrição"],
  ["DESCRIÃ‡ÃƒO", "DESCRIÇÃO"],
  ["Descri��o", "Descrição"],
  ["descri��o", "descrição"],
  ["descri��Ã£o", "descrição"],

  ["NÃºmero", "Número"],
  ["nÃºmero", "número"],
  ["N�mero", "Número"],
  ["n�mero", "número"],

  ["EmissÃ£o", "Emissão"],
  ["emissÃ£o", "emissão"],
  ["Emiss�o", "Emissão"],
  ["emiss�o", "emissão"],

  ["VeÃ­culo", "Veículo"],
  ["veÃ­culo", "veículo"],
  ["Ve�culo", "Veículo"],
  ["ve�culo", "veículo"],

  ["HistÃ³rico", "Histórico"],
  ["histÃ³rico", "histórico"],
  ["Hist�rico", "Histórico"],
  ["hist�rico", "histórico"],

  ["PÃºblico", "Público"],
  ["pÃºblico", "público"],
  ["PÃºblicos", "Públicos"],
  ["pÃºblicos", "públicos"],
  ["P�blico", "Público"],
  ["p�blico", "público"],

  ["DisponÃ­veis", "Disponíveis"],
  ["disponÃ­veis", "disponíveis"],
  ["Dispon�veis", "Disponíveis"],
  ["dispon�veis", "disponíveis"],

  ["operaÃ§Ã£o", "operação"],
  ["OperaÃ§Ã£o", "Operação"],
  ["opera��o", "operação"],
  ["Opera��o", "Operação"],

  ["mÃªs", "mês"],
  ["MÃªs", "Mês"],
  ["m�s", "mês"],
  ["M�s", "Mês"],

  ["mÃ©dio", "médio"],
  ["MÃ©dio", "Médio"],
  ["m�dio", "médio"],
  ["M�dio", "Médio"],

  ["perÃ­odo", "período"],
  ["per�odo", "período"],
  ["saÃ­das", "saídas"],
  ["SaÃ­das", "Saídas"],
  ["sa�das", "saídas"],

  ["lanÃ§amento", "lançamento"],
  ["lanÃ§amentos", "lançamentos"],
  ["LanÃ§amento", "Lançamento"],
  ["Novo lanÃ§amento", "Novo lançamento"],
  ["lan�amento", "lançamento"],
  ["lan�amentos", "lançamentos"],
  ["Lan�amento", "Lançamento"],
  ["Novo lan�amento", "Novo lançamento"],

  ["rÃ¡pida", "rápida"],
  ["RÃ¡pida", "Rápida"],
  ["r�pida", "rápida"],
  ["R�pida", "Rápida"],

  ["aprovaÃ§Ã£o", "aprovação"],
  ["AprovaÃ§Ã£o", "Aprovação"],
  ["aprova��o", "aprovação"],
  ["Aprova��o", "Aprovação"],

  ["ProteÃ§Ã£o", "Proteção"],
  ["PROTEÃ‡ÃƒO", "PROTEÇÃO"],
  ["Prote��o", "Proteção"],
  ["PROTE��O", "PROTEÇÃO"],

  ["EstÃ©tica", "Estética"],
  ["ESTÃ‰TICA", "ESTÉTICA"],
  ["Est�tica", "Estética"],
  ["EST�TICA", "ESTÉTICA"],

  ["cartÃ£o", "cartão"],
  ["CartÃ£o", "Cartão"],
  ["cart�o", "cartão"],
  ["Cart�o", "Cartão"],

  ["transferÃªncia", "transferência"],
  ["TransferÃªncia", "Transferência"],
  ["transfer�ncia", "transferência"],
  ["Transfer�ncia", "Transferência"],

  ["pelÃ­cula", "película"],
  ["PelÃ­cula", "Película"],
  ["pel�cula", "película"],
  ["Pel�cula", "Película"],

  ["sÃ¡bado", "sábado"],
  ["SÃ¡bado", "Sábado"],
  ["s�bado", "sábado"],
  ["S�bado", "Sábado"],

  ["HorÃ¡rio", "Horário"],
  ["horÃ¡rio", "horário"],
  ["Hor�rio", "Horário"],
  ["hor�rio", "horário"],

  ["nÃ£o", "não"],
  ["NÃ£o", "Não"],
  ["n�o", "não"],
  ["N�o", "Não"],

  ["atenÃ§Ã£o", "atenção"],
  ["AtenÃ§Ã£o", "Atenção"],
  ["observaÃ§Ãµes", "observações"],
  ["ObservaÃ§Ãµes", "Observações"],

  ["â€¢", "•"],
  ["â€“", "-"],
  ["â€”", "-"],
  ["Â·", "·"],

  ["Ã©", "é"],
  ["Ãª", "ê"],
  ["Ã¡", "á"],
  ["Ã ", "à"],
  ["Ã£", "ã"],
  ["Ã¢", "â"],
  ["Ã­", "í"],
  ["Ã³", "ó"],
  ["Ã´", "ô"],
  ["Ãº", "ú"],
  ["Ã§", "ç"]
];

function repairText(text) {
  let output = text.replace(/^\uFEFF/, "");

  for (let round = 0; round < 4; round++) {
    for (const [bad, good] of replacements) {
      output = output.split(bad).join(good);
    }
  }

  return output;
}

const files = [
  ...walk("apps/web/src", [".ts", ".tsx", ".css"]),
  ...walk("apps/api/src", [".ts"]),
  "apps/api/prisma/schema.prisma"
].filter((file, index, arr) => arr.indexOf(file) === index && exists(file));

console.log("Backup criado em:", backupDir);
console.log("Arquivos analisados:", files.length);

for (const file of files) {
  backup(file);

  const before = read(file);
  const after = repairText(before);

  write(file, after);

  if (after !== before) {
    console.log("Encoding corrigido:", file);
  }
}

const webPackage = "apps/web/package.json";

if (exists(webPackage)) {
  backup(webPackage);

  const pkg = JSON.parse(read(webPackage));
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies.html2canvas = pkg.dependencies.html2canvas || "^1.4.1";
  pkg.dependencies.jspdf = pkg.dependencies.jspdf || "^2.5.2";

  write(webPackage, JSON.stringify(pkg, null, 2) + "\n");

  console.log("Dependencias PDF conferidas em apps/web/package.json");
}

const cssFile = "apps/web/src/styles.css";

if (exists(cssFile)) {
  backup(cssFile);

  let css = repairText(read(cssFile));

  const start = "/* === SPRINT 3.1.3 NODE PDF QA FIX START === */";
  const end = "/* === SPRINT 3.1.3 NODE PDF QA FIX END === */";

  const block = `${start}
.pdfCaptureStage {
  position: fixed;
  left: -100000px;
  top: 0;
  width: 210mm;
  min-height: 297mm;
  background: #ffffff;
  padding: 0;
  overflow: visible;
  z-index: -1;
}

.pdfCaptureStage .quoteDocument,
.pdfQuoteDocument {
  width: 198mm !important;
  max-width: 198mm !important;
  min-height: 285mm !important;
  margin: 0 auto !important;
  padding: 8mm !important;
  border-radius: 8px !important;
  box-shadow: none !important;
  overflow: visible !important;
  transform: none !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.pdfQuoteDocument .quoteDocHeader {
  margin-bottom: 6mm !important;
}

.pdfQuoteDocument .quoteDocInfoGrid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 5mm !important;
  margin: 6mm 0 !important;
}

.pdfQuoteDocument .quoteDocCard {
  padding: 5mm !important;
  min-height: 34mm !important;
}

.pdfQuoteDocument .quoteItemsTable th,
.pdfQuoteDocument .quoteItemsTable td {
  padding: 3mm 2mm !important;
}

.pdfQuoteDocument .quoteTotalsBox {
  margin-top: 5mm !important;
}

.pdfQuoteDocument .quoteDocFooter {
  margin-top: 8mm !important;
  padding-top: 5mm !important;
}

.pdfQuoteDocument .noPrint,
.pdfQuoteDocument .previewActions,
.pdfQuoteDocument button {
  display: none !important;
}

.sidebar {
  min-height: 100vh;
}

.sidebarUserCard,
.sidebarFooter,
.userCard {
  margin-top: auto;
}
${end}`;

  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`);

  if (regex.test(css)) {
    css = css.replace(regex, block);
  } else {
    css += "\n\n" + block + "\n";
  }

  write(cssFile, css);

  console.log("CSS PDF/sidebar corrigido.");
}

const qa = `# QA Sprint 3.1.3 Node Fix

## Corrigido
- Varredura de encoding/mojibake em apps/web/src, apps/api/src e schema.prisma.
- Normalizacao UTF-8 via Node, sem PowerShell escrevendo texto acentuado.
- Garantia das dependencias html2canvas e jspdf.
- CSS dedicado para captura A4 do orcamento.
- Ajuste preventivo do card/botao Sair na sidebar.

## Teste manual obrigatorio
1. Ctrl+F5 no navegador.
2. Conferir menu: Servicos, Orcamentos/OS, Configuracoes e Financeiro.
3. Conferir Financeiro: Novo lancamento, Receita rapida, Despesa rapida, Baixar, Editar e Cancelar.
4. Conferir Orcamentos: Novo, Editar, Duplicar, Desconto R$, Desconto %, Visualizar.
5. Gerar PDF com 1 item.
6. Gerar PDF com muitos itens.
7. Conferir se PDF nao fica branco, nao corta cabecalho, nao quebra termos sozinho e nao aparece texto corrompido.
8. Conferir Servicos: agendados, cancelados, concluidos e orcamento vinculado.
9. Conferir Agenda publica: horario ocupado some; cancelado libera.
`;

fs.writeFileSync(abs("QA_SPRINT_3_1_3_NODE_FIX.md"), qa, "utf8");

console.log("QA criado: QA_SPRINT_3_1_3_NODE_FIX.md");
console.log("");
console.log("Concluido. Agora rode:");
console.log("pnpm install");
console.log("pnpm --filter @duartefilms/api exec tsc --noEmit");
console.log("pnpm --filter @duartefilms/web exec tsc --noEmit");
console.log("pnpm dev");