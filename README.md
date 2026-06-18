# SESI Vôlei MKT — Planner conectado ao Google Sheets

Esta versão usa o Google Sheets como base externa. O planner lê, cria, edita e exclui tarefas por meio do Web App do Google Apps Script.

## Como funciona

- Ao abrir o site, o planner carrega as tarefas da aba `tarefas` no Google Sheets.
- Ao clicar em **Salvar card**, a tarefa é atualizada na planilha.
- Ao clicar em **Adicionar tarefa**, uma nova linha é criada na planilha.
- Ao excluir uma tarefa, a linha correspondente é removida da planilha.
- O arquivo `data.js` fica apenas como base de segurança caso o Web App não responda.

## Arquivos principais

- `index.html` — estrutura da página.
- `style.css` — visual do planner.
- `app.js` — integração com o Google Sheets.
- `data.js` — fallback local.
- `README.md` — instruções.

## Publicação

Envie estes arquivos para a raiz do repositório `Grecc0/sesivolei_mkt`:

- `index.html`
- `style.css`
- `app.js`
- `data.js`
- `README.md`

Depois faça o commit. O GitHub Pages continuará publicando em:

```text
https://grecc0.github.io/sesivolei_mkt/
```

## Atenção

O Web App do Apps Script deve estar implantado com:

```text
Executar como: Eu
Quem tem acesso: Qualquer pessoa
```

Como o Web App permite escrita na planilha, compartilhe o link do planner apenas com pessoas que podem editar o acompanhamento.
