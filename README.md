# SESI Vôlei MKT — Planner de Ações

Esta versão permite editar o planner diretamente na página, inclusive os títulos das tarefas.

## O que é editável

Todos os campos abaixo podem ser editados diretamente nos cards:

- Título da tarefa
- Descrição
- Responsável
- Prioridade
- Status
- Andamento
- Início planejado
- Prazo
- Próxima ação
- Observações

Também é possível:

- adicionar novas tarefas;
- duplicar tarefas;
- excluir tarefas;
- filtrar por status;
- buscar por texto;
- exportar CSV;
- exportar JSON;
- baixar `data.js` atualizado;
- importar JSON ou `data.js`.

## Como publicar no GitHub Pages

1. Descompacte este pacote.
2. Envie estes arquivos para a raiz do repositório:
   - `index.html`
   - `style.css`
   - `data.js`
   - `app.js`
   - `README.md`
3. Faça o commit.
4. No GitHub, vá em **Settings > Pages**.
5. Em **Build and deployment**, selecione **Deploy from a branch**.
6. Branch: `main`.
7. Folder: `/root`.
8. Clique em **Save**.

Endereço esperado:

```text
https://grecc0.github.io/sesivolei_mkt/
```

## Como atualizar o site para todos

As alterações ficam salvas no navegador de quem editou.

Para publicar as alterações para todo mundo:

1. Edite o planner.
2. Clique em **Baixar data.js atualizado**.
3. Substitua o arquivo `data.js` no GitHub.
4. Faça o commit.
5. Aguarde a atualização do GitHub Pages.

## Observação

Este é um site estático. Para edição simultânea com salvamento centralizado em tempo real, é necessário integrar uma base externa, como Google Sheets, Firebase ou Supabase.
