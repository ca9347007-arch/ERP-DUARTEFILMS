import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
const backupDir = path.join(root, `backups_sprint3_1_4_pdf_finance_${stamp}`);
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
  ["Or\uFFFDamentos", "Or\u00E7amentos"],
  ["or\uFFFDamentos", "or\u00E7amentos"],
  ["Or\uFFFDamento", "Or\u00E7amento"],
  ["or\uFFFDamento", "or\u00E7amento"],
  ["OR\uFFFDAMENTO", "OR\u00C7AMENTO"],

  ["Servi\uFFFDos", "Servi\u00E7os"],
  ["servi\uFFFDos", "servi\u00E7os"],
  ["Servi\uFFFDo", "Servi\u00E7o"],
  ["servi\uFFFDo", "servi\u00E7o"],

  ["Configura\uFFFD\uFFFDes", "Configura\u00E7\u00F5es"],
  ["configura\uFFFD\uFFFDes", "configura\u00E7\u00F5es"],
  ["Configura\uFFFD\uFFFD\uFFFDes", "Configura\u00E7\u00F5es"],
  ["configura\uFFFD\uFFFD\uFFFDes", "configura\u00E7\u00F5es"],
  ["Configura\uFFFD\uFFFD\\u00f5es", "Configura\u00E7\u00F5es"],

  ["Descri\uFFFD\uFFFDo", "Descri\u00E7\u00E3o"],
  ["descri\uFFFD\uFFFDo", "descri\u00E7\u00E3o"],
  ["DESCRI\uFFFD\uFFFDO", "DESCRI\u00C7\u00C3O"],
  ["descri\uFFFD\uFFFD\uFFFDo", "descri\u00E7\u00E3o"],

  ["N\uFFFDmero", "N\u00FAmero"],
  ["n\uFFFDmero", "n\u00FAmero"],

  ["Emiss\uFFFDo", "Emiss\u00E3o"],
  ["emiss\uFFFDo", "emiss\u00E3o"],

  ["Ve\uFFFDculo", "Ve\u00EDculo"],
  ["ve\uFFFDculo", "ve\u00EDculo"],

  ["Hist\uFFFDrico", "Hist\u00F3rico"],
  ["hist\uFFFDrico", "hist\u00F3rico"],

  ["P\uFFFDblico", "P\u00FAblico"],
  ["p\uFFFDblico", "p\u00FAblico"],
  ["P\uFFFDblicos", "P\u00FAblicos"],
  ["p\uFFFDblicos", "p\u00FAblicos"],

  ["Dispon\uFFFDveis", "Dispon\u00EDveis"],
  ["dispon\uFFFDveis", "dispon\u00EDveis"],

  ["opera\uFFFD\uFFFDo", "opera\u00E7\u00E3o"],
  ["Opera\uFFFD\uFFFDo", "Opera\u00E7\u00E3o"],

  ["decis\uFFFDo", "decis\u00E3o"],
  ["Decis\uFFFDo", "Decis\u00E3o"],

  ["autom\uFFFDtico", "autom\u00E1tico"],
  ["Autom\uFFFDtico", "Autom\u00E1tico"],

  ["pr\uFFFD-visualiza\uFFFD\uFFFDo", "pr\u00E9-visualiza\u00E7\u00E3o"],
  ["Pr\uFFFD-visualiza\uFFFD\uFFFDo", "Pr\u00E9-visualiza\u00E7\u00E3o"],

  ["m\uFFFDs", "m\u00EAs"],
  ["M\uFFFDs", "M\u00EAs"],

  ["m\uFFFDdio", "m\u00E9dio"],
  ["M\uFFFDdio", "M\u00E9dio"],

  ["per\uFFFDodo", "per\u00EDodo"],
  ["Per\uFFFDodo", "Per\u00EDodo"],

  ["sa\uFFFDdas", "sa\u00EDdas"],
  ["Sa\uFFFDdas", "Sa\u00EDdas"],

  ["lan\uFFFDamento", "lan\u00E7amento"],
  ["lan\uFFFDamentos", "lan\u00E7amentos"],
  ["Lan\uFFFDamento", "Lan\u00E7amento"],
  ["Lan\uFFFDamentos", "Lan\u00E7amentos"],

  ["r\uFFFDpida", "r\u00E1pida"],
  ["R\uFFFDpida", "R\u00E1pida"],

  ["aprova\uFFFD\uFFFDo", "aprova\u00E7\u00E3o"],
  ["Aprova\uFFFD\uFFFDo", "Aprova\u00E7\u00E3o"],

  ["Prote\uFFFD\uFFFDo", "Prote\u00E7\u00E3o"],
  ["PROTE\uFFFD\uFFFDO", "PROTE\u00C7\u00C3O"],

  ["Est\uFFFDtica", "Est\u00E9tica"],
  ["EST\uFFFDTICA", "EST\u00C9TICA"],

  ["cart\uFFFDo", "cart\u00E3o"],
  ["Cart\uFFFDo", "Cart\u00E3o"],

  ["transfer\uFFFDncia", "transfer\u00EAncia"],
  ["Transfer\uFFFDncia", "Transfer\u00EAncia"],

  ["pel\uFFFDcula", "pel\u00EDcula"],
  ["Pel\uFFFDcula", "Pel\u00EDcula"],

  ["s\uFFFDado", "s\u00E1bado"],
  ["s\uFFFDabado", "s\u00E1bado"],
  ["S\uFFFDado", "S\u00E1bado"],
  ["S\uFFFDabado", "S\u00E1bado"],

  ["Hor\uFFFDrio", "Hor\u00E1rio"],
  ["hor\uFFFDrio", "hor\u00E1rio"],

  ["n\uFFFDo", "n\u00E3o"],
  ["N\uFFFDo", "N\u00E3o"],

  ["aten\uFFFD\uFFFDo", "aten\u00E7\u00E3o"],
  ["observa\uFFFD\uFFFDes", "observa\u00E7\u00F5es"],

  ["\uFFFD bmw", "\u2022 bmw"],
  [" \uFFFD ", " \u2022 "],

  ["Or\u00C3\u00A7amentos", "Or\u00E7amentos"],
  ["or\u00C3\u00A7amento", "or\u00E7amento"],
  ["Servi\u00C3\u00A7os", "Servi\u00E7os"],
  ["servi\u00C3\u00A7os", "servi\u00E7os"],
  ["Configura\u00C3\u00A7\u00C3\u00B5es", "Configura\u00E7\u00F5es"],
  ["Descri\u00C3\u00A7\u00C3\u00A3o", "Descri\u00E7\u00E3o"],
  ["descri\u00C3\u00A7\u00C3\u00A3o", "descri\u00E7\u00E3o"],
  ["N\u00C3\u00BAmero", "N\u00FAmero"],
  ["Emiss\u00C3\u00A3o", "Emiss\u00E3o"],
  ["Ve\u00C3\u00ADculo", "Ve\u00EDculo"],
  ["Hist\u00C3\u00B3rico", "Hist\u00F3rico"],
  ["P\u00C3\u00BAblico", "P\u00FAblico"],
  ["opera\u00C3\u00A7\u00C3\u00A3o", "opera\u00E7\u00E3o"],
  ["lan\u00C3\u00A7amento", "lan\u00E7amento"],
  ["aprova\u00C3\u00A7\u00C3\u00A3o", "aprova\u00E7\u00E3o"],
  ["pel\u00C3\u00ADcula", "pel\u00EDcula"],
  ["cart\u00C3\u00A3o", "cart\u00E3o"],
  ["transfer\u00C3\u00AAncia", "transfer\u00EAncia"],
  ["\u00E2\u20AC\u00A2", "\u2022"],
  ["\u00C2\u00B7", "\u00B7"]
];

function repairText(input) {
  let output = input.replace(/^\uFEFF/, "");

  for (let round = 0; round < 6; round++) {
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

function addImportIfMissing(source, importLine, marker) {
  if (source.includes(marker)) return source;
  return `${importLine}\n${source}`;
}

const quotesFile = "apps/web/src/pages/Quotes.tsx";

if (exists(quotesFile)) {
  backup(quotesFile);

  let source = repairText(read(quotesFile));

  source = addImportIfMissing(source, 'import html2canvas from "html2canvas";', "from \"html2canvas\"");
  source = addImportIfMissing(source, 'import { jsPDF } from "jspdf";', "from \"jspdf\"");

  function findMatchingBrace(text, openIndex) {
    let depth = 0;

    for (let i = openIndex; i < text.length; i++) {
      const ch = text[i];

      if (ch === "{") depth++;
      if (ch === "}") depth--;

      if (depth === 0) return i;
    }

    return -1;
  }

  const functionRegex = /(?:async\s+)?function\s+([A-Za-z0-9_]*Pdf|printQuote|downloadQuote|exportQuote|generateQuotePdf|downloadQuotePdf)\s*\(([^)]*)\)\s*\{/g;

  let match;
  let replacedPdfFunction = false;

  while ((match = functionRegex.exec(source)) !== null) {
    const fnStart = match.index;
    const bodyOpen = source.indexOf("{", match.index);
    const bodyEnd = findMatchingBrace(source, bodyOpen);

    if (bodyEnd === -1) continue;

    const fnBlock = source.slice(fnStart, bodyEnd + 1);

    if (!/html2canvas|jsPDF|window\.print|printWindow|addImage/.test(fnBlock)) {
      continue;
    }

    const fnName = match[1];
    const params = match[2].trim();
    const firstParamName = (params.split(",")[0] || "quote").trim().split(":")[0].trim() || "quote";

    const replacement = `async function ${fnName}(${params}) {
    const quote = ${firstParamName};
    const sourceNode = document.getElementById("printableQuoteDocument") || document.querySelector(".quoteDocument");

    if (!sourceNode) {
      alert("Documento do orçamento não encontrado para gerar PDF.");
      return;
    }

    const fileCode = typeof quoteCode === "function" ? quoteCode(quote) : String(quote?.code || "000000").replace(/[^0-9]/g, "").padStart(6, "0");
    const fileName = \`DuarteFilms OS \${fileCode}.pdf\`;

    const stage = document.createElement("div");
    stage.className = "pdfCaptureStage";
    stage.setAttribute("aria-hidden", "true");

    const cloned = sourceNode.cloneNode(true);
    cloned.classList.add("pdfQuoteDocument");

    stage.appendChild(cloned);
    document.body.appendChild(stage);

    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await html2canvas(cloned, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: cloned.scrollWidth,
        windowHeight: cloned.scrollHeight
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const pageH = 297;
      const margin = 6;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      const imgW = canvas.width;
      const imgH = canvas.height;

      const fitWidthH = imgH * (usableW / imgW);

      if (fitWidthH <= usableH * 1.22) {
        const ratio = Math.min(usableW / imgW, usableH / imgH);
        const finalW = imgW * ratio;
        const finalH = imgH * ratio;
        const x = (pageW - finalW) / 2;
        const y = (pageH - finalH) / 2;

        pdf.addImage(canvas.toDataURL("image/png", 1.0), "PNG", x, y, finalW, finalH, undefined, "FAST");
      } else {
        const ratio = usableW / imgW;
        const pagePxH = Math.floor(usableH / ratio);
        let yPx = 0;
        let pageIndex = 0;

        while (yPx < imgH) {
          const sliceH = Math.min(pagePxH, imgH - yPx);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = imgW;
          pageCanvas.height = sliceH;

          const ctx = pageCanvas.getContext("2d");
          if (!ctx) throw new Error("Falha ao criar contexto do canvas para PDF.");

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, yPx, imgW, sliceH, 0, 0, imgW, sliceH);

          if (pageIndex > 0) pdf.addPage();

          const finalH = sliceH * ratio;
          pdf.addImage(pageCanvas.toDataURL("image/png", 1.0), "PNG", margin, margin, usableW, finalH, undefined, "FAST");

          yPx += sliceH;
          pageIndex++;
        }
      }

      pdf.save(fileName);
    } finally {
      stage.remove();
    }
  }`;

    source = source.slice(0, fnStart) + replacement + source.slice(bodyEnd + 1);
    replacedPdfFunction = true;
    break;
  }

  if (!replacedPdfFunction) {
    console.log("AVISO: funcao PDF nao encontrada automaticamente em Quotes.tsx.");
  } else {
    console.log("Funcao PDF corrigida em Quotes.tsx.");
  }

  write(quotesFile, source);
}

const financeFile = "apps/web/src/pages/Finance.tsx";

if (exists(financeFile)) {
  backup(financeFile);

  let source = repairText(read(financeFile));

  source = source.replace(/className="([^"]*\bdrawerPanel\b[^"]*)"/g, (full, cls) => {
    if (cls.includes("financeFullScreenDrawer")) return full;
    return `className="${cls} financeFullScreenDrawer"`;
  });

  source = source.replace(/className="([^"]*\bdrawerContent\b[^"]*)"/g, (full, cls) => {
    if (cls.includes("financeFullScreenDrawer")) return full;
    return `className="${cls} financeFullScreenDrawer"`;
  });

  source = source.replace(/<form className="/g, '<form className="financeFullForm ');

  write(financeFile, source);

  console.log("Financeiro preparado para drawer/tela cheia.");
}

const cssFile = "apps/web/src/styles.css";

if (exists(cssFile)) {
  backup(cssFile);

  let css = repairText(read(cssFile));

  const start = "/* === SPRINT 3.1.4 PDF FINANCE FINAL FIX START === */";
  const end = "/* === SPRINT 3.1.4 PDF FINANCE FINAL FIX END === */";

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
  width: 196mm !important;
  max-width: 196mm !important;
  min-height: auto !important;
  margin: 0 auto !important;
  padding: 7mm !important;
  border-radius: 8px !important;
  box-shadow: none !important;
  overflow: visible !important;
  transform: none !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.pdfQuoteDocument .quoteDocHeader {
  margin-bottom: 5mm !important;
}

.pdfQuoteDocument .quoteDocInfoGrid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 4mm !important;
  margin: 5mm 0 !important;
}

.pdfQuoteDocument .quoteDocCard {
  padding: 4mm !important;
  min-height: 28mm !important;
}

.pdfQuoteDocument .quoteItemsTable th,
.pdfQuoteDocument .quoteItemsTable td {
  padding: 2.4mm 2mm !important;
}

.pdfQuoteDocument .quoteTotalsBox {
  margin-top: 4mm !important;
}

.pdfQuoteDocument .quoteDocFooter {
  margin-top: 5mm !important;
  padding-top: 4mm !important;
}

.pdfQuoteDocument .noPrint,
.pdfQuoteDocument .previewActions,
.pdfQuoteDocument button {
  display: none !important;
}

.financeFullScreenDrawer,
.drawerPanel.financeFullScreenDrawer,
.drawerContent.financeFullScreenDrawer {
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: calc(100vw - 260px) !important;
  max-width: none !important;
  min-width: 0 !important;
  height: 100vh !important;
  padding: 36px 48px !important;
  overflow-y: auto !important;
  border-left: 1px solid rgba(212, 175, 55, 0.25) !important;
  border-radius: 0 !important;
}

.financeFullForm {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 18px 20px !important;
  max-width: 1120px !important;
}

.financeFullForm textarea,
.financeFullForm .full,
.financeFullForm .wideField {
  grid-column: 1 / -1 !important;
}

.financeFullScreenDrawer .drawerActions,
.financeFullScreenDrawer .formActions {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 16px !important;
  max-width: 1120px !important;
}

.sidebar {
  min-height: 100vh;
}

.sidebarUserCard,
.sidebarFooter,
.userCard {
  margin-top: auto;
}

@media (max-width: 980px) {
  .financeFullScreenDrawer,
  .drawerPanel.financeFullScreenDrawer,
  .drawerContent.financeFullScreenDrawer {
    width: 100vw !important;
    padding: 24px !important;
  }

  .financeFullForm {
    grid-template-columns: 1fr !important;
  }
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

  console.log("CSS final de PDF/Financeiro aplicado.");
}

const webPackage = "apps/web/package.json";

if (exists(webPackage)) {
  backup(webPackage);

  const pkg = JSON.parse(read(webPackage));
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies.html2canvas = pkg.dependencies.html2canvas || "^1.4.1";
  pkg.dependencies.jspdf = pkg.dependencies.jspdf || "^2.5.2";

  write(webPackage, JSON.stringify(pkg, null, 2) + "\n");

  console.log("Dependencias PDF conferidas.");
}

const qa = `# QA Sprint 3.1.4

## Foco
- Corrigir texto residual com caractere quebrado.
- Corrigir PDF cortando bloco.
- Fazer lançamento financeiro abrir em tela cheia.
- Validar antes do commit.

## Checklist
1. Ctrl+F5 no navegador.
2. Abrir /orcamentos e confirmar acentos.
3. Visualizar orçamento com 1 item.
4. Gerar PDF com 1 item.
5. Visualizar orçamento com muitos itens.
6. Gerar PDF com muitos itens.
7. Confirmar que o PDF nao fica branco.
8. Confirmar que o PDF nao corta o bloco Valor total.
9. Abrir /financeiro.
10. Clicar Novo lancamento.
11. Confirmar que o formulario ocupa a tela toda.
12. Criar receita.
13. Criar despesa.
14. Editar.
15. Baixar.
16. Cancelar.
17. Rodar git diff antes do commit.
`;

fs.writeFileSync(abs("QA_SPRINT_3_1_4.md"), qa, "utf8");

console.log("QA criado: QA_SPRINT_3_1_4.md");
console.log("");
console.log("Concluido. Agora rode:");
console.log("pnpm install");
console.log("pnpm --filter @duartefilms/api exec tsc --noEmit");
console.log("pnpm --filter @duartefilms/web exec tsc --noEmit");
console.log("pnpm dev");