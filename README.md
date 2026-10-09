# Fatura do Cartão

Página para dividir a fatura do cartão por pessoa. Importe o CSV da fatura (formato do Nubank), escolha de quem é cada compra e veja as parcelas projetadas mês a mês.

## Como rodar

```bash
npm install
npm run dev
```

## Banco de dados: planilha Google

Tudo o que entra no app é gravado na aba `Lancamentos` da planilha, uma linha por compra:

```text
Data | Descricao | Categoria | Conta | Valor | Quem usou | Cartao | Status | Parcelas | Observacao
```

- Compras parceladas são gravadas uma vez só, com `Parcelas` e `[primeira-parcela=AAAA-MM]` na observação; o app calcula as parcelas dos outros meses.
- Importar a mesma fatura de novo não duplica: compras que já estão na planilha são ignoradas.
- Trocar o dono ou marcar "Repete todo mês" regrava a linha da compra; "excluir" apaga a linha.
- O app lê e grava pelo Apps Script da planilha, definido na variável `VITE_GOOGLE_SCRIPT_URL` do Netlify. Ele usa só as ações `listTransactions`, `appendTransactions` e `deleteTransaction`, que já existem no script.

Sem `VITE_GOOGLE_SCRIPT_URL`, os dados ficam só no navegador.

## Como usar

- **Importar fatura**: escolha o CSV exportado da fatura e o cartão. O app mostra quantas compras são novas antes de gravar.
- **Dono de cada compra**: Matheus é fixo; as outras pessoas vêm da coluna `Quem usou`. O app sugere o dono pelas compras anteriores com o mesmo nome.
- **Cartão**: o seletor no topo filtra por cartão (Nubank, Carrefour, …) ou mostra todos.
- **Baixar tudo / Baixar lista / Copiar**: gera planilha Excel ou texto para mandar para cada pessoa.

O arquivo [`apps-script/Code.gs`](apps-script/Code.gs) tem uma versão completa do Apps Script, caso precise reinstalar.
