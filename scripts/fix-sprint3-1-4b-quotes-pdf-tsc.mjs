import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "apps/web/src/pages/Quotes.tsx");
const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
const backup = path.join(root, `backup_Quotes_before_pdf_fix_${stamp}.tsx`);

if (!fs.existsSync(file)) {
  throw new Error("Quotes.tsx nao encontrado em apps/web/src/pages/Quotes.tsx");
}

let source = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
fs.writeFileSync(backup, source, "utf8");

if (!/from\s+["']html2canvas["']/.test(source)) {
  source = `import html2canvas from "html2canvas";\n${source}`;
}

if (!/from\s+["']jspdf["']/.test(source)) {
  source = `import { jsPDF } from "jspdf";\n${source}`;
}

function findFunctionEnd(text, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = openBraceIndex; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (ch === quote) {
        quote = null;
      }

      continue;
    }

    if (ch === "/" && next === "/") {
      lineComment = true;
      i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) return i;
  }

  return -1;
}

const match = source.match(/async\s+function\s+printQuote\s*\([^)]*\)\s*\{|function\s+printQuote\s*\([^)]*\)\s*\{/);

if (!match || match.index === undefined) {
  throw new Error("Funcao printQuote nao encontrada em Quotes.tsx");
}

const start = match.index;
const openBrace = source.indexOf("{", start);
const end = findFunctionEnd(source, openBrace);

if (end === -1) {
  throw new Error("Nao consegui encontrar o fim da funcao printQuote");
}

const fixedFunction = `async function printQuote(quote: Quote) {
    const sourceNode = (
      document.getElementById("printableQuoteDocument") ||
      document.querySelector(".quoteDocument")
    ) as HTMLElement | null;

    if (!sourceNode) {
      alert("Documento do orcamento nao encontrado para gerar PDF.");
      return;
    }

    const fileCode = typeof quoteCode === "function"
      ? quoteCode(quote)
      : String(quote?.code || "000000").replace(/[^0-9]/g, "").padStart(6, "0");

    const fileName = \`DuarteFilms OS \${fileCode}.pdf\`;

    const stage = document.createElement("div");
    stage.className = "pdfCaptureStage";
    stage.setAttribute("aria-hidden", "true");

    const cloned = sourceNode.cloneNode(true) as HTMLElement;
    cloned.classList.add("pdfQuoteDocument");

    stage.appendChild(cloned);
    document.body.appendChild(stage);

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

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

      const heightIfFitWidth = imgH * (usableW / imgW);

      if (heightIfFitWidth <= usableH) {
        const ratio = Math.min(usableW / imgW, usableH / imgH);
        const finalW = imgW * ratio;
        const finalH = imgH * ratio;
        const x = (pageW - finalW) / 2;
        const y = (pageH - finalH) / 2;

        pdf.addImage(
          canvas.toDataURL("image/png", 1.0),
          "PNG",
          x,
          y,
          finalW,
          finalH,
          undefined,
          "FAST"
        );
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

          if (!ctx) {
            throw new Error("Falha ao criar contexto do canvas para PDF.");
          }

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, yPx, imgW, sliceH, 0, 0, imgW, sliceH);

          if (pageIndex > 0) pdf.addPage();

          const finalH = sliceH * ratio;

          pdf.addImage(
            pageCanvas.toDataURL("image/png", 1.0),
            "PNG",
            margin,
            margin,
            usableW,
            finalH,
            undefined,
            "FAST"
          );

          yPx += sliceH;
          pageIndex++;
        }
      }

      pdf.save(fileName);
    } finally {
      stage.remove();
    }
  }`;

source = source.slice(0, start) + fixedFunction + source.slice(end + 1);

fs.writeFileSync(file, source, "utf8");

console.log("Quotes.tsx corrigido.");
console.log("Backup criado em:", backup);
console.log("Agora rode:");
console.log("pnpm --filter @duartefilms/web exec tsc --noEmit");