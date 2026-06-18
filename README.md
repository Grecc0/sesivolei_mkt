# SESI Vôlei MKT — Planner conectado ao Supabase

Esta versão conecta o planner diretamente ao Supabase.

## O que mudou

- O planner carrega as tarefas da tabela `public.tarefas`.
- O botão **Salvar card** atualiza o registro no Supabase.
- O botão **Adicionar tarefa** cria uma nova linha na tabela.
- O botão **Excluir tarefa** remove a linha da tabela.
- O botão **Salvar todas** atualiza todas as tarefas.
- O botão **Recarregar base** busca novamente os dados do Supabase.
- O `data.js` fica apenas como fallback, caso a tabela esteja vazia ou indisponível.

## Configuração usada

```text
SUPABASE_URL=https://turirctfxxjuovkkkeam.supabase.co
TABLE_NAME=tarefas
```

## Arquivos do site

Envie estes arquivos para a raiz do repositório:

- `index.html`
- `style.css`
- `app.js`
- `data.js`
- `README.md`

## Tabela esperada no Supabase

A tabela deve se chamar `tarefas` e ter estas colunas:

- `id`
- `atividade`
- `descricao`
- `responsavel`
- `prioridade`
- `status`
- `andamento`
- `inicioPlanejado`
- `prazo`
- `proximaAcao`
- `observacoes`
- `ultimaAtualizacao`

## Observação de segurança

Esta versão usa a publishable key no navegador e depende das policies de Row Level Security do Supabase. Como o objetivo é um planner editável por quem tem o link, as policies precisam permitir `select`, `insert`, `update` e `delete` para o papel `anon`.


## Observação sobre a publishable key

Esta versão usa a chave `sb_publishable_...` apenas no cabeçalho `apikey`, sem enviar essa chave como `Authorization: Bearer`, para manter compatibilidade com o modelo novo de chaves do Supabase.
