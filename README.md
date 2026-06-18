# SESI Vôlei MKT — Planner de Acompanhamento

Planner online para acompanhamento das ações de marketing e comunicação do vôlei.

## Arquivos do site

Para publicar corretamente, envie estes arquivos para a raiz do repositório:

- `index.html`
- `style.css`
- `data.js`
- `app.js`
- `README.md`

Não envie o arquivo `.zip` direto para o GitHub. Primeiro descompacte o pacote e depois envie os arquivos acima.

## Como subir no GitHub

1. Baixe o arquivo `sesivolei_mkt_site_corrigido.zip`.
2. Descompacte o arquivo no computador.
3. Acesse o repositório `Grecc0/sesivolei_mkt`.
4. Clique em **Add file > Upload files**.
5. Arraste os arquivos descompactados para a área de upload.
6. Clique em **Commit changes**.

## Como publicar no GitHub Pages

1. No repositório, acesse **Settings**.
2. No menu lateral, clique em **Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Em **Branch**, selecione:
   - Branch: `main`
   - Folder: `/root`
5. Clique em **Save**.

Depois de alguns instantes, o site deverá ficar disponível em:

```text
https://grecc0.github.io/sesivolei_mkt/
```

## Como atualizar o acompanhamento para todos

As alterações feitas diretamente na página ficam salvas apenas no navegador de quem editou.

Para atualizar o painel público para toda a equipe:

1. Abra o arquivo `data.js`.
2. Altere os campos necessários:
   - `responsavel`
   - `prioridade`
   - `status`
   - `andamento`
   - `proximaAcao`
   - `observacoes`
3. Faça um novo commit no GitHub.
4. O GitHub Pages atualizará o site automaticamente.

## Observação importante

Este é um site estático. Ele serve muito bem para acompanhamento público, mas não funciona como sistema colaborativo com salvamento centralizado em tempo real. Para isso, seria necessário integrar uma base externa, como Google Sheets, Firebase ou Supabase.
