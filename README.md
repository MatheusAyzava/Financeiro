# Fatura do Cartão e Empréstimos

Página para dividir a fatura do cartão por pessoa e controlar os empréstimos que você pegou. Importe o CSV da fatura (formato do Nubank), escolha de quem é cada compra e veja as parcelas projetadas mês a mês.

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
- **Cartões**: abas no topo separam Nubank, Itaú, C6 e Banco do Brasil (e outros cartões que estiverem na planilha), com o total do mês de cada um.
- **Baixar tudo / Baixar lista / Copiar**: gera planilha Excel ou texto para mandar para cada pessoa.

## Casa

A aba **Casa** controla aluguel e contas que não são do cartão (condomínio, luz, água, internet, gás, IPTU…). Cada conta tem valor previsto e dia de vencimento e aparece todo mês; em "Pagar" você informa o valor real do mês. Contas vencidas e não pagas aparecem como atrasadas.

Na aba `Lancamentos`, sem cartão: a conta fixa é uma linha com `[conta-casa] [recorrente] [vencimento=DD]` e cada pagamento é uma linha com `[conta-casa] [pago]`. Essas linhas não entram na fatura do cartão, mas entram em Gastos x Recebidos.

## Recebidos

A aba **Recebidos** lança o que entra (salário, freela, reembolso…) como linha com valor positivo na aba `Lancamentos`. "Repete todo mês" projeta o recebimento nos meses seguintes até haver um lançamento com o mesmo nome.

## Gastos x Recebidos

Resumo do mês (recebido, gasto, saldo e quanto sobrou) e gráficos: recebido x gasto mês a mês, saldo acumulado, onde mais gastamos (categorias), gastos por cartão, por pessoa, maiores gastos e as 5 maiores categorias mês a mês. Os gastos somam todos os cartões, as contas da casa, a média do Cartão Gabi e as parcelas dos empréstimos.

## Cartão Gabi

Nos meses sem fatura importada do `Cartão Gabi`, o app usa uma média mensal (R$ 1.000 por padrão, editável na aba do cartão). A média fica salva no navegador.

## Empréstimos

A aba **Empréstimos** controla o que você pegou: valor, credor, valor e número de parcelas e mês da primeira. Marque cada parcela como paga; o app mostra quanto falta pagar e as parcelas de cada mês.

Os empréstimos ficam na aba `Emprestimos` da planilha (criada sozinha), uma linha por empréstimo:

```text
ID | Data | Descricao | Credor | Valor total | Parcelas | Valor parcela | Primeira parcela | Parcelas pagas | Falta pagar | Meses pagos | Observacao
```

Para isso o Apps Script precisa das ações `listEmprestimos`, `saveEmprestimo` e `deleteEmprestimo`: cole o conteúdo de [`apps-script/Code.gs`](apps-script/Code.gs) em `Extensões > Apps Script` e faça `Implantar > Gerenciar implantações > lápis > Nova versão > Implantar`. Enquanto o script não for atualizado, os empréstimos ficam salvos só no navegador e são enviados para a planilha na primeira vez que ela responder.

O arquivo [`apps-script/Code.gs`](apps-script/Code.gs) tem uma versão completa do Apps Script, caso precise reinstalar.
