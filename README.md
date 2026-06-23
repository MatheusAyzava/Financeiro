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
2026-06-23 | Supermercado | Alimentacao | Banco do Brasil | -1400 | Eu | Nubank | Pago | 1 |
2026-06-23 | Combustivel | Transporte | Banco do Brasil | -200 | Matheus | Banco do Brasil | Pendente | 1 | Emprestei o cartao
2026-06-15 | Salario | Salario | Banco do Brasil | 3150 | Eu | | Pago | 1 |
```

Valores positivos entram como receita. Valores negativos entram como despesa.

## Vencimentos e lembretes

Na tela `Planejamento`, voce pode cadastrar:

- Cartoes com dia de fechamento e dia de vencimento, por exemplo Nubank vencendo dia 8.
- Lembretes de contas recorrentes, por exemplo MEI, internet, aluguel, energia ou qualquer compromisso.
- Metas financeiras, como reserva de emergencia, viagem ou quitar uma divida.
- Dividas e emprestimos, separando valores a receber e valores a pagar.

Os cards aparecem no mes selecionado e podem ser marcados como pagos. Nos cards de cartao, use `Editar vencimento` para alterar dia de vencimento, fechamento, nome e valor previsto. A `Visao Geral` tambem mostra os proximos vencimentos pendentes para evitar esquecer contas importantes.

## Cartoes, pessoas e parcelas

- Ao cadastrar um lancamento parcelado, o app cria automaticamente uma parcela por mes.
- A tela `Cartoes` mostra uso estimado por cartao e contas a receber de pessoas que usaram seu cartao.
- Em `Lancamentos`, o filtro por pessoa ajuda a ver rapidamente tudo que Matheus, Alessandra ou outra pessoa usou.

## Relatorios e backup

- A tela `Relatorios` compara receitas, despesas e saldo do mes atual com o mes anterior.
- Em `Configuracoes`, voce pode exportar os lancamentos em CSV, baixar um backup JSON e restaurar um backup.

## Observacao sobre a chave

Chave de API no frontend deve ser usada apenas para leitura de planilhas publicas ou com restricao por dominio no Google Cloud. Mesmo salva pela tela do app, ela fica no navegador do usuario. Se voce quiser gravar lancamentos na planilha, o caminho mais seguro e usar um backend com OAuth ou conta de servico.
