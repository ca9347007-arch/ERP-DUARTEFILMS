export function Quotes() {
  return (
    <section>
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Sprint 3</span>
          <h1>Orçamentos e ordens de serviço</h1>
          <p>A API base já possui criação de orçamento e aprovação para gerar OS. A tela completa será a próxima etapa.</p>
        </div>
      </div>
      <div className="card">
        <h2>Fluxo recomendado</h2>
        <ol className="steps">
          <li>Criar orçamento com cliente, veículo e itens.</li>
          <li>Enviar modelo visual para o cliente.</li>
          <li>Aprovar orçamento.</li>
          <li>Gerar ordem de serviço com checklist.</li>
          <li>Baixar estoque manual ou assistido.</li>
        </ol>
      </div>
    </section>
  );
}
