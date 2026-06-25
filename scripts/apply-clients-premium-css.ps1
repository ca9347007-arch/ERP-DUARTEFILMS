$stylesPath = "apps\web\src\styles.css"
$markerStart = "/* === SPRINT 2 CLIENTES PREMIUM START === */"
$markerEnd = "/* === SPRINT 2 CLIENTES PREMIUM END === */"

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
/* === SPRINT 2 CLIENTES PREMIUM START === */
.premiumModule { display: grid; gap: 22px; }
.premiumPageHeader { margin-bottom: 0; }
.premiumAction { min-height: 46px; padding-inline: 18px; }
.clientStatsGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.miniMetricCard {
  position: relative;
  overflow: hidden;
  background: linear-gradient(145deg, rgba(32,32,32,.96), rgba(20,20,20,.96));
  border: 1px solid rgba(212, 175, 55, .14);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 20px 50px rgba(0,0,0,.22);
}
.miniMetricCard::after {
  content: '';
  position: absolute;
  right: -22px;
  bottom: -26px;
  width: 90px;
  height: 90px;
  border-radius: 999px;
  background: rgba(212, 175, 55, .1);
  filter: blur(4px);
}
.miniMetricCard span,
.toolbarHint,
.clientCardTop span,
.clientMetaGrid span { color: var(--df-muted); font-size: 13px; font-weight: 800; }
.miniMetricCard strong { display: block; margin-top: 8px; font-size: 30px; color: var(--df-gold-light); }
.miniMetricCard small { display: block; margin-top: 4px; color: #777; font-weight: 700; }
.moduleToolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: rgba(26,26,26,.62);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 20px;
  padding: 12px;
}
.searchField {
  width: min(100%, 720px);
  display: flex;
  align-items: center;
  grid-template-columns: unset;
  gap: 10px;
  background: rgba(255,255,255,.045);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 16px;
  padding: 0 12px;
  color: var(--df-muted);
}
.searchField input { border: 0; background: transparent; box-shadow: none; padding: 13px 0; }
.searchField input:focus { border: 0; box-shadow: none; background: transparent; }
.crmGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.clientCard {
  background: linear-gradient(145deg, rgba(30,30,30,.96), rgba(18,18,18,.98));
  border: 1px solid rgba(212, 175, 55, .14);
  border-radius: 24px;
  padding: 18px;
  min-height: 246px;
  display: grid;
  align-content: start;
  gap: 14px;
  box-shadow: 0 24px 70px rgba(0,0,0,.23);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.clientCard:hover { transform: translateY(-3px); border-color: rgba(212,175,55,.34); box-shadow: 0 28px 80px rgba(0,0,0,.32); }
.clientCardTop { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; }
.clientCardTop strong { display: block; font-size: 17px; color: var(--df-text); }
.clientAvatar {
  width: 48px;
  height: 48px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: var(--df-gold-gradient);
  color: #080808;
  font-weight: 950;
  box-shadow: 0 12px 28px rgba(212,175,55,.16);
}
.iconButton {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 14px;
  background: rgba(255,255,255,.07);
  color: var(--df-text);
  box-shadow: none;
  border: 1px solid rgba(255,255,255,.08);
}
.iconButton:hover { border-color: rgba(212,175,55,.35); color: var(--df-gold-light); }
.clientContactRow { display: flex; flex-wrap: wrap; gap: 8px; }
.contactPill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--df-text);
  text-decoration: none;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 13px;
  font-weight: 800;
}
.whatsappPill { background: rgba(34,197,94,.1); color: #bbf7d0; border-color: rgba(34,197,94,.16); }
.clientMetaGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.clientMetaGrid div {
  border: 1px solid rgba(255,255,255,.07);
  background: rgba(255,255,255,.045);
  border-radius: 16px;
  padding: 12px;
}
.clientMetaGrid strong { display: block; margin-top: 5px; color: var(--df-gold-light); }
.vehiclePreview {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d6d6d6;
  background: rgba(212,175,55,.075);
  border: 1px solid rgba(212,175,55,.12);
  border-radius: 16px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 800;
}
.mutedPreview { color: var(--df-muted); background: rgba(255,255,255,.035); border-color: rgba(255,255,255,.06); }
.clientNotes { margin: 0; font-size: 13px; color: #aaa; }
.premiumEmptyState {
  grid-column: 1 / -1;
  min-height: 320px;
  border: 1px dashed rgba(212,175,55,.24);
  border-radius: 28px;
  background: linear-gradient(145deg, rgba(30,30,30,.8), rgba(14,14,14,.9));
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
  gap: 10px;
  color: var(--df-muted);
}
.premiumEmptyState svg { opacity: .55; color: var(--df-gold-light); }
.premiumEmptyState strong { color: var(--df-text); font-size: 20px; }
.drawerBackdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,.58);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: flex-end;
  animation: drawerFadeIn .18s ease-out;
}
.sideDrawer {
  width: min(100%, 520px);
  height: 100vh;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(25,25,25,.98), rgba(10,10,10,.99));
  border-left: 1px solid rgba(212,175,55,.2);
  box-shadow: -24px 0 80px rgba(0,0,0,.46);
  padding: 26px;
  animation: drawerSlideIn .24s ease-out;
}
.drawerHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.drawerHeader h2 { margin: 4px 0 6px; }
.drawerHeader p { margin: 0; }
.drawerForm { display: grid; gap: 14px; }
.drawerActions { display: grid; grid-template-columns: 1fr 1.3fr; gap: 10px; margin-top: 8px; }
.errorBanner {
  background: var(--df-danger-bg);
  color: var(--df-danger-text);
  border: 1px solid rgba(248,113,113,.24);
  border-radius: 16px;
  padding: 12px 14px;
  margin-bottom: 14px;
  font-weight: 800;
}
@keyframes drawerFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes drawerSlideIn { from { transform: translateX(24px); opacity: .8; } to { transform: translateX(0); opacity: 1; } }
@media (max-width: 1200px) {
  .clientStatsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .crmGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .premiumPageHeader, .moduleToolbar { align-items: stretch; flex-direction: column; }
  .clientStatsGrid, .crmGrid { grid-template-columns: 1fr; }
  .drawerActions { grid-template-columns: 1fr; }
}
/* === SPRINT 2 CLIENTES PREMIUM END === */
'@

Set-Content $stylesPath -Value ($content.TrimEnd() + "`r`n`r`n" + $css + "`r`n")
Write-Host "CSS premium de Clientes aplicado em $stylesPath"
