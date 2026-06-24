# FinControl

Aplicativo de controle financeiro em React, inspirado no prototipo criado no Lovable. Ele mostra visao geral, lancamentos, planejamento, configuracoes e pode carregar os dados direto do Google Sheets.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra o endereco exibido pelo Vite no navegador.

## Configurar Google Sheets pela tela do app

1. Entre em `Configuracoes`.
2. Cole sua chave da API do Google.
3. Cole a URL completa da planilha ou apenas o ID.
4. Mantenha o intervalo como `Lancamentos!A:J`, se a aba tiver esse nome.
5. Clique em `Salvar e sincronizar`.

A configuracao fica salva no navegador.

## Configurar Google Sheets por .env

1. Copie `.env.example` para `.env`.
2. Preencha:

```bash
VITE_GOOGLE_API_KEY=sua_chave_da_api
VITE_GOOGLE_SHEET_ID=id_da_sua_planilha
VITE_GOOGLE_SHEET_RANGE=Lancamentos!A:J
VITE_GOOGLE_SCRIPT_URL=url_do_web_app_do_google_apps_script
```

O ID da planilha fica na URL:

```text
https://docs.google.com/spreadsheets/d/ESTE_E_O_ID_DA_PLANILHA/edit
```

## Formato da aba Lancamentos

A primeira linha deve ser o cabecalho. As 5 primeiras colunas sao obrigatorias e as demais sao opcionais:

```text
Data | Descricao | Categoria | Conta | Valor | Quem usou | Cartao | Status | Parcelas | Observacao
```

Exemplo:

```text
2026-06-23 | Supermercado | Alimentacao | Banco do Brasil | -1400 | Eu | Nubank | Debito | 1 |
2026-06-23 | Combustivel | Transporte | Banco do Brasil | -200 | Matheus | Banco do Brasil | Debito | 1 | Emprestei o cartao
2026-06-15 | Salario | Salario | Banco do Brasil | 3150 | Eu | | Credito | 1 |
```

Valores positivos entram como receita e normalmente usam status `Credito`. Valores negativos entram como despesa e normalmente usam status `Debito`.

## Gravar novos lancamentos no Google Sheets

A Google Sheets API com `VITE_GOOGLE_API_KEY` serve para ler a planilha. Para gravar novos lancamentos, crie um Web App no Google Apps Script:

1. Na planilha, clique em `Extensoes > Apps Script`.
2. Apague o conteudo inicial e cole:

```javascript
const SHEET_NAME = 'Lancamentos';

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const action = e.parameter.action;
  const callback = e.parameter.callback;

  if (action === 'listTransactions') {
    const values = sheet.getDataRange().getValues().map((row, rowIndex) =>
      row.map((cell, columnIndex) => {
        if (rowIndex > 0 && columnIndex === 0 && cell instanceof Date) {
          return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }

        return cell;
      })
    );
    const output = JSON.stringify({ values });

    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${output})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(output)
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput('ignored');
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const payloadText = e.parameter.payload || e.postData.contents || '{}';
  const payload = JSON.parse(payloadText);

  if (payload.action === 'appendTransactions') {
    const rows = payload.transactions || [];

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
    }

    return ContentService.createTextOutput('ok');
  }

  if (payload.action === 'deleteTransaction') {
    const row = Number(payload.sheetRow);

    if (row > 1 && row <= sheet.getLastRow()) {
      sheet.deleteRow(row);
      return ContentService.createTextOutput('deleted');
    }

    const target = JSON.stringify(payload.transaction || []);
    const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 10).getValues();
    const index = values.findIndex((current) => JSON.stringify(current) === target);

    if (index >= 0) {
      sheet.deleteRow(index + 2);
      return ContentService.createTextOutput('deleted');
    }
  }

  if (payload.action === 'updateTransaction') {
    const row = Number(payload.sheetRow);
    const transaction = payload.transaction || [];

    if (row > 1 && row <= sheet.getLastRow()) {
      sheet.getRange(row, 1, 1, 10).setValues([transaction]);
      return ContentService.createTextOutput('updated');
    }
  }

  return ContentService.createTextOutput('ignored');
}
```

3. Clique em `Implantar > Nova implantacao`.
4. Tipo: `App da Web`.
5. Executar como: `Eu`.
6. Quem tem acesso: `Qualquer pessoa`.
7. Clique em `Implantar` e copie a URL que termina em `/exec`.
8. No Netlify, crie a variavel:

```text
VITE_GOOGLE_SCRIPT_URL = URL_DO_APPS_SCRIPT
```

Depois faca redeploy no Netlify. A partir dai, novos lancamentos criados no app tambem serao adicionados na aba `Lancamentos`, edicoes atualizarao a linha correspondente, exclusoes feitas no app tambem removerao a linha correspondente da planilha, e todos os dispositivos passarao a carregar os lancamentos direto do Apps Script.

## Vencimentos e lembretes

Na tela `Planejamento`, voce pode cadastrar:

- Cartoes com dia de fechamento e dia de vencimento, por exemplo Nubank vencendo dia 8.
- Lembretes de contas recorrentes, por exemplo MEI, internet, aluguel, energia ou qualquer compromisso.
- Metas financeiras, como reserva de emergencia, viagem ou quitar uma divida.
- Dividas e emprestimos, separando valores a receber e valores a pagar.

Os cards aparecem no mes selecionado e podem ser marcados como pagos. Nos cards de cartao, use `Editar vencimento` para alterar dia de vencimento, fechamento, nome e valor previsto. A `Visao Geral` tambem mostra os proximos vencimentos pendentes para evitar esquecer contas importantes.

## Cartoes, pessoas e parcelas

- Ao cadastrar uma despesa parcelada, o app cria automaticamente uma parcela por mes a partir do mes seguinte. Exemplo: compra feita em maio em `3x` cria parcelas em junho, julho e agosto.
- No cadastro, escolha se o valor digitado e o `Valor total da compra` ou o `Valor de cada parcela`. O padrao e `Valor de cada parcela`, para o app nao dividir novamente valores como `29,49`.
- Se voce escolher `Valor total da compra`, o app divide o valor pelo numero de parcelas.
- Se uma linha ja existir na planilha com `Parcelas` maior que `1`, o app tambem projeta essas parcelas nos meses seguintes ao carregar os dados.
- Ao editar uma parcela projetada, o app edita a compra original da planilha e recalcula as parcelas.
- O campo `Parcelas` aceita compras longas, como `48x` ou `60x`.
- A tela `Cartoes` mostra uso estimado por cartao e contas a receber de pessoas que usaram seu cartao.
- Em `Lancamentos`, o filtro por pessoa ajuda a ver rapidamente tudo que Matheus, Alessandra ou outra pessoa usou.

## Relatorios e backup

- A tela `Relatorios` compara receitas, despesas e saldo do mes atual com o mes anterior.
- Em `Configuracoes`, voce pode exportar os lancamentos em CSV, baixar um backup JSON e restaurar um backup.

## Observacao sobre a chave

Chave de API no frontend deve ser usada apenas para leitura de planilhas publicas ou com restricao por dominio no Google Cloud. Mesmo salva pela tela do app, ela fica no navegador do usuario. Se voce quiser gravar lancamentos na planilha, o caminho mais seguro e usar um backend com OAuth ou conta de servico.
