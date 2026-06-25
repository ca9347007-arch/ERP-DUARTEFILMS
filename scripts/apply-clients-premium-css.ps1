$stylesPath = "apps\web\src\styles.css"
$markerStart = "/* === SPRINT 2 SERVICOS PREMIUM START === */"
$markerEnd = "/* === SPRINT 2 SERVICOS PREMIUM END === */"

if (!(Test-Path $stylesPath)) {
  Write-Error "Arquivo $stylesPath não encontrado. Rode este script na raiz do projeto."
  exit 1
}

$content = Get-Content $stylesPath -Raw
if ($content.Contains($markerStart)) {
  $pattern = [regex]::Escape($markerStart) + "[\s\S]*?" + [regex]::Escape($markerEnd)
  $content = [regex]::Replace($content, $pattern, "")
}

$css = @'
/* === SPRINT 2 SERVICOS PREMIUM START === */
.clientQuickActions {
  display: flex;
  gap: 10px;
  margin-top: 2px;
}
.quoteShortcutButton {
  width: 100%;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 14px;
  border: 1px solid rgba(212,175,55,.18);
  background: linear-gradient(135deg, rgba(212,175,55,.12), rgba(255,255,255,.045));
  color: var(--df-gold-light);
  box-shadow: none;
  font-weight: 900;
}
.quoteShortcutButton:hover {
  transform: translateY(-2px);
  border-color: rgba(212,175,55,.42);
  box-shadow: 0 14px 32px rgba(212,175,55,.08);
}
.servicesModule { gap: 22px; }
.serviceGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.serviceCard {
  position: relative;
  overflow: hidden;
  min-height: 258px;
  display: grid;
  align-content: start;
  gap: 15px;
  background: linear-gradient(145deg, rgba(30,30,30,.96), rgba(17,17,17,.98));
  border: 1px solid rgba(212,175,55,.14);
  border-radius: 24px;
  padding: 18px;
  box-shadow: 0 24px 70px rgba(0,0,0,.24);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.serviceCard::after {
  content: '';
  position: absolute;
  right: -32px;
  bottom: -38px;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: rgba(212,175,55,.09);
  filter: blur(4px);
  pointer-events: none;
}
.serviceCard:hover {
  transform: translateY(-3px);
  border-color: rgba(212,175,55,.36);
  box-shadow: 0 28px 80px rgba(0,0,0,.33);
}
.serviceCardTop {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
}
.serviceCardTop strong {
  display: block;
  font-size: 17px;
  color: var(--df-text);
}
.serviceCardTop span {
  display: block;
  margin-top: 4px;
  color: var(--df-muted);
  font-size: 13px;
  line-height: 1.45;
}
.serviceIcon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: rgba(212,175,55,.12);
  color: var(--df-gold-light);
  border: 1px solid rgba(212,175,55,.18);
}
.servicePriceBlock {
  position: relative;
  z-index: 1;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(212,175,55,.16);
  background: linear-gradient(135deg, rgba(212,175,55,.11), rgba(255,255,255,.04));
}
.servicePriceBlock span {
  display: block;
  color: var(--df-muted);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.servicePriceBlock strong {
  display: block;
  margin-top: 5px;
  color: var(--df-gold-light);
  font-size: 28px;
  letter-spacing: -.04em;
}
.serviceMetaRow,
.serviceStatusRow {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.serviceMetaRow span {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(255,255,255,.075);
  color: #d8d8d8;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 900;
}
.statusBadge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  border-radius: 999px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 950;
  border: 1px solid rgba(255,255,255,.08);
}
.statusBadge.success {
  color: #bbf7d0;
  background: rgba(34,197,94,.1);
  border-color: rgba(34,197,94,.18);
}
.statusBadge.muted {
  color: #d4d4d8;
  background: rgba(255,255,255,.06);
}
.drawerTwoColumns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.checkLine {
  display: flex !important;
  align-items: center;
  grid-template-columns: unset !important;
  gap: 10px;
  border: 1px solid rgba(255,255,255,.075);
  border-radius: 16px;
  background: rgba(255,255,255,.045);
  padding: 12px 14px;
  color: var(--df-text);
}
.checkLine input {
  width: 18px;
  height: 18px;
  accent-color: #d4af37;
}
@media (max-width: 1200px) {
  .serviceGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .serviceGrid, .drawerTwoColumns { grid-template-columns: 1fr; }
  .serviceStatusRow .quoteShortcutButton { width: 100%; }
}
/* === SPRINT 2 SERVICOS PREMIUM END === */
'@

Set-Content $stylesPath -Value ($content.TrimEnd() + "`r`n`r`n" + $css + "`r`n")
Write-Host "CSS premium de Serviços e atalho de orçamento aplicado em $stylesPath"
