$ErrorActionPreference = "Stop"
$cssPath = "apps\web\src\styles.css"
$start = "/* === SPRINT 3 ORCAMENTOS AGENDA START === */"
$end = "/* === SPRINT 3 ORCAMENTOS AGENDA END === */"

if (!(Test-Path $cssPath)) {
  throw "Arquivo CSS não encontrado em $cssPath. Rode este script na raiz do projeto."
}

$css = Get-Content $cssPath -Raw
if ($css.Contains($start)) {
  $pattern = [regex]::Escape($start) + "[\s\S]*?" + [regex]::Escape($end)
  $css = [regex]::Replace($css, $pattern, "")
}

$block = @'
/* === SPRINT 3 ORCAMENTOS AGENDA START === */
.drawerTwoColumns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.clientQuickActions { display: flex; gap: 8px; flex-wrap: wrap; }

/* Serviços premium corrigido */
.servicesModule .serviceGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.serviceCard {
  background: linear-gradient(145deg, rgba(30,30,30,.96), rgba(14,14,14,.98));
  border: 1px solid rgba(212,175,55,.14);
  border-radius: 24px;
  padding: 18px;
  display: grid;
  gap: 14px;
  min-height: 250px;
  box-shadow: 0 24px 70px rgba(0,0,0,.23);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.serviceCard:hover { transform: translateY(-3px); border-color: rgba(212,175,55,.34); }
.serviceCardTop { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start; }
.serviceCardTop strong { display: block; color: var(--df-text); font-size: 17px; }
.serviceCardTop span { display: block; margin-top: 4px; color: var(--df-muted); font-size: 13px; line-height: 1.35; }
.serviceIcon {
  width: 44px; height: 44px; border-radius: 16px; display: grid; place-items: center;
  background: rgba(212,175,55,.1); color: var(--df-gold-light); border: 1px solid rgba(212,175,55,.16);
}
.servicePriceBlock { border: 1px solid rgba(255,255,255,.07); border-radius: 18px; padding: 14px; background: rgba(255,255,255,.045); }
.servicePriceBlock span, .serviceMetaRow span { color: var(--df-muted); font-weight: 800; font-size: 13px; }
.servicePriceBlock strong { display: block; margin-top: 4px; color: var(--df-gold-light); font-size: 26px; }
.serviceMetaRow, .serviceStatusRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.serviceMetaRow span { display: inline-flex; align-items: center; gap: 6px; }
.statusBadge { display: inline-flex; align-items: center; border-radius: 999px; padding: 8px 12px; font-size: 12px; font-weight: 950; }
.statusBadge.success { background: rgba(34,197,94,.12); color: #86efac; border: 1px solid rgba(34,197,94,.18); }
.statusBadge.muted { background: rgba(255,255,255,.06); color: var(--df-muted); border: 1px solid rgba(255,255,255,.08); }
.quoteShortcutButton { box-shadow: none; min-height: 38px; padding: 9px 12px; border-radius: 13px; }
.serviceDonePanel {
  display: grid; grid-template-columns: 1.2fr auto 1.6fr; gap: 18px; align-items: center;
  background: linear-gradient(145deg, rgba(26,26,26,.92), rgba(12,12,12,.96));
  border: 1px solid rgba(212,175,55,.16); border-radius: 24px; padding: 20px;
}
.serviceDonePanel h2 { margin: 4px 0 6px; }
.serviceDonePanel p { margin: 0; }
.doneMetrics { border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.045); border-radius: 18px; padding: 14px 18px; min-width: 170px; }
.doneMetrics strong { display: block; color: var(--df-gold-light); font-size: 34px; line-height: 1; }
.doneMetrics span, .doneMetrics small { color: var(--df-muted); font-weight: 800; display: block; margin-top: 5px; }
.doneServiceList { display: grid; gap: 8px; }
.doneServiceItem { display: grid; grid-template-columns: 1.1fr 1.4fr auto; gap: 10px; align-items: center; border: 1px solid rgba(255,255,255,.07); border-radius: 16px; padding: 10px 12px; background: rgba(255,255,255,.04); }
.doneServiceItem span, .doneServiceItem small { color: var(--df-muted); font-size: 13px; }

/* Agenda premium */
.agendaPremiumModule { display: grid; gap: 26px; }
.agendaHeaderActions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.agendaPremiumContainer { max-width: 1120px; display: grid; gap: 30px; }
.agendaDateHeader { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.agendaDateHeader h3 { margin: 0; font-size: 17px; }
.agendaDateHeader div { flex: 1; height: 1px; background: rgba(255,255,255,.1); }
.appointmentTimelineCard {
  position: relative; overflow: hidden; display: grid; grid-template-columns: 100px 1px 1fr auto; gap: 22px; align-items: center;
  background: linear-gradient(145deg, rgba(26,26,26,.94), rgba(14,14,14,.98));
  border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 20px; margin-bottom: 12px;
  transition: transform .2s ease, border-color .2s ease, background .2s ease;
}
.appointmentTimelineCard:hover { transform: translateX(4px); border-color: rgba(212,175,55,.28); background: rgba(26,26,26,.98); }
.appointmentTimelineCard::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--df-gold); }
.appointmentTimelineCard.status-confirmed::before, .appointmentTimelineCard.status-finished::before { background: #22c55e; }
.appointmentTimelineCard.status-canceled::before { background: #ef4444; opacity: .7; }
.appointmentTimelineCard.status-pending::before { background: #eab308; }
.appointmentTimelineCard.status-progress::before { background: #60a5fa; }
.appointmentTimeBlock { text-align: center; }
.appointmentTimeBlock strong { display: block; font-size: 24px; color: var(--df-text); }
.appointmentTimeBlock span, .appointmentInfoBlock span, .appointmentInfoBlock small { color: var(--df-muted); }
.appointmentDivider { width: 1px; height: 48px; background: rgba(255,255,255,.1); }
.appointmentInfoBlock strong { display: block; font-size: 17px; margin-bottom: 5px; }
.appointmentInfoBlock small { display: block; margin-top: 5px; }
.appointmentActionBlock { display: grid; grid-template-columns: auto minmax(150px, 180px); gap: 8px; align-items: center; justify-content: end; }
.appointmentActionBlock select { min-height: 38px; padding: 8px 10px; border-radius: 12px; }
.appointmentBadge { display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; padding: 8px 12px; font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: .02em; }
.appointmentBadge i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.appointmentBadge.confirmed, .appointmentBadge.finished { background: rgba(34,197,94,.12); color: #86efac; border: 1px solid rgba(34,197,94,.2); }
.appointmentBadge.confirmed i, .appointmentBadge.finished i { background: #22c55e; }
.appointmentBadge.canceled { background: rgba(239,68,68,.12); color: #fca5a5; border: 1px solid rgba(239,68,68,.2); }
.appointmentBadge.canceled i { background: #ef4444; }
.appointmentBadge.pending { background: rgba(234,179,8,.12); color: #fde68a; border: 1px solid rgba(234,179,8,.22); }
.appointmentBadge.pending i { background: #eab308; }
.appointmentBadge.progress { background: rgba(96,165,250,.12); color: #bfdbfe; border: 1px solid rgba(96,165,250,.22); }
.appointmentBadge.progress i { background: #60a5fa; }
.compactAction { min-height: 38px; padding: 8px 11px; }
.status-canceled .appointmentTimeBlock strong, .status-canceled .appointmentInfoBlock { opacity: .48; text-decoration: line-through; }

/* Orçamentos / OS */
.quotesPremiumModule { display: grid; gap: 22px; }
.quotePipeline { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; align-items: start; }
.quoteColumn { min-height: 420px; border: 1px solid rgba(255,255,255,.08); border-radius: 22px; background: rgba(18,18,18,.72); padding: 14px; display: grid; align-content: start; gap: 12px; }
.quoteColumn.attention { border-color: rgba(234,179,8,.24); background: linear-gradient(180deg, rgba(234,179,8,.06), rgba(18,18,18,.72)); }
.quoteColumn h2 { font-size: 16px; margin: 2px 0 6px; }
.emptyColumn { min-height: 110px; display: grid; place-items: center; text-align: center; border: 1px dashed rgba(255,255,255,.1); border-radius: 16px; margin: 0; padding: 18px; }
.quotePipelineCard { position: relative; display: grid; gap: 10px; border: 1px solid rgba(212,175,55,.14); background: linear-gradient(145deg, rgba(30,30,30,.96), rgba(12,12,12,.98)); border-radius: 18px; padding: 14px; box-shadow: 0 18px 50px rgba(0,0,0,.22); }
.quotePipelineTop { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.quotePipelineTop span { color: var(--df-gold-light); font-size: 12px; font-weight: 950; }
.quotePipelineTop strong { font-size: 17px; }
.quotePipelineCard h3 { margin: 0; font-size: 16px; }
.quotePipelineCard p, .quotePipelineCard small { margin: 0; color: var(--df-muted); }
.quotePipelineActions, .quoteStatusActions { display: flex; flex-wrap: wrap; gap: 8px; }
.quotePipelineActions button, .quotePipelineActions a, .quoteStatusActions button { min-height: 34px; padding: 7px 10px; border-radius: 12px; font-size: 12px; }
.followUpRibbon { display: inline-flex; align-items: center; gap: 6px; justify-self: start; color: #fde68a; background: rgba(234,179,8,.12); border: 1px solid rgba(234,179,8,.25); border-radius: 999px; padding: 6px 9px; font-size: 11px; font-weight: 950; }
.quoteDrawer { width: min(100%, 620px); }
.quotePreviewDrawer { width: min(100%, 980px); }
.previewActions { display: flex; gap: 8px; align-items: center; }
.quoteDocument { background: #09090b; border: 1px solid rgba(255,255,255,.08); border-radius: 22px; padding: 34px; color: var(--df-text); }
.quoteDocument::before { content: ''; display: block; height: 4px; background: var(--df-gold-gradient); border-radius: 999px; margin: -34px -34px 28px; }
.quoteDocHeader { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,.08); }
.quoteDocBrand { display: flex; align-items: center; gap: 12px; }
.quoteDocBrand span { display: block; color: var(--df-gold); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
.quoteDocMeta { text-align: right; }
.quoteDocMeta h2 { margin: 0 0 8px; font-size: 30px; }
.quoteDocMeta > span { display: inline-flex; color: var(--df-gold-light); border: 1px solid rgba(212,175,55,.22); background: rgba(212,175,55,.08); border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 950; }
.quoteDocMetaGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; margin-top: 16px; text-align: left; }
.quoteDocMetaGrid small, .quoteDocInfoGrid p { color: var(--df-muted); }
.quoteDocMetaGrid b, .quoteDocInfoGrid b { color: var(--df-text); }
.quoteDocInfoGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 24px 0; }
.quoteDocInfoGrid > div { border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.035); border-radius: 18px; padding: 18px; }
.quoteDocInfoGrid h3, .quoteDocFooter h4 { margin: 0 0 10px; color: var(--df-gold); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
.quoteItemsTable { width: 100%; border-collapse: collapse; margin: 20px 0; }
.quoteItemsTable th { color: var(--df-muted); font-size: 12px; text-align: left; text-transform: uppercase; letter-spacing: .08em; padding: 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
.quoteItemsTable td { padding: 16px 14px; border-bottom: 1px solid rgba(255,255,255,.08); }
.quoteItemsTable td:not(:first-child), .quoteItemsTable th:not(:first-child) { text-align: right; }
.quoteItemsTable td span { display: block; margin-top: 4px; color: var(--df-muted); font-size: 13px; }
.quoteTotalsBox { width: min(100%, 360px); margin-left: auto; display: grid; gap: 8px; }
.quoteTotalsBox div { display: flex; justify-content: space-between; gap: 20px; color: var(--df-muted); }
.quoteTotalsBox .grandTotal { margin-top: 8px; border: 1px solid rgba(212,175,55,.22); background: rgba(212,175,55,.08); color: var(--df-gold-light); border-radius: 14px; padding: 16px; font-size: 18px; }
.quoteDocFooter { display: flex; justify-content: space-between; gap: 26px; border-top: 1px solid rgba(255,255,255,.08); margin-top: 28px; padding-top: 22px; }
.signatureLine { min-width: 220px; text-align: center; padding-top: 44px; color: var(--df-muted); border-top: 1px solid rgba(255,255,255,.18); align-self: end; }
@media print {
  .sidebar, .drawerHeader, .drawerBackdrop > .sideDrawer:not(.quotePreviewDrawer) { display: none !important; }
  .drawerBackdrop { position: static; background: #fff; display: block; }
  .quotePreviewDrawer { width: 100%; height: auto; box-shadow: none; border: none; padding: 0; }
  .quoteDocument { border: none; border-radius: 0; }
}
@media (max-width: 1300px) { .servicesModule .serviceGrid, .quotePipeline { grid-template-columns: repeat(2, minmax(0, 1fr)); } .serviceDonePanel { grid-template-columns: 1fr; } }
@media (max-width: 860px) {
  .appointmentTimelineCard { grid-template-columns: 1fr; gap: 12px; }
  .appointmentDivider { display: none; }
  .appointmentActionBlock { grid-template-columns: 1fr; justify-content: stretch; }
  .quotePipeline, .servicesModule .serviceGrid { grid-template-columns: 1fr; }
  .quoteDocHeader, .quoteDocInfoGrid, .quoteDocFooter, .drawerTwoColumns { grid-template-columns: 1fr; flex-direction: column; }
  .quoteDocMeta { text-align: left; }
  .doneServiceItem { grid-template-columns: 1fr; }
}
/* === SPRINT 3 ORCAMENTOS AGENDA END === */
'@

Set-Content -Path $cssPath -Value ($css.TrimEnd() + "`r`n`r`n" + $block + "`r`n") -Encoding UTF8
Write-Host "CSS Sprint 3 aplicado em $cssPath"
