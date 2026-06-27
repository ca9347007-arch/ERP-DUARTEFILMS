# QA Sprint 3.1.3 Node Fix

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
