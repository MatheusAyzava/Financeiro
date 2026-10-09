# Fatura do Cartão

Página para dividir a fatura do cartão por pessoa. Importe o CSV da fatura (formato do Nubank), escolha de quem é cada compra e veja as parcelas projetadas mês a mês.

## Como rodar

```bash
npm install
npm run dev
```

## Como usar

- **Importar fatura**: escolha o CSV exportado da fatura. Cada fatura fica guardada pelo mês dela.
- **Dono de cada compra**: Matheus é fixo; use `Outro…` ou `Pessoas` para adicionar quem mais usou o cartão. O app lembra o dono nas próximas faturas.
- **Parcelas**: compras parceladas aparecem listradas como previsão nos meses seguintes.
- **Baixar tudo / Baixar lista / Copiar**: gera planilha Excel ou texto para mandar para cada pessoa.
- **Baixar backup / Restaurar backup**: leva os dados para outro navegador ou aparelho.

## Dados

Os dados ficam salvos no navegador. Para sincronizar com a planilha Google:

1. Na planilha, abra `Extensões > Apps Script`, apague o código e cole o conteúdo de [`apps-script/Code.gs`](apps-script/Code.gs).
2. `Implantar > Gerenciar implantações`, clique no lápis, escolha `Nova versão` e `Implantar` (ou `Nova implantação` > `App da Web`, executar como `Eu`, acesso `Qualquer pessoa`, se ainda não houver uma).
3. No Netlify, defina a variável `VITE_GOOGLE_SCRIPT_URL` com a URL que termina em `/exec` e faça um novo deploy.

Na primeira vez que a planilha responder, o que já estiver salvo no navegador é enviado para a aba `Faturas` (criada automaticamente). Depois disso, todos os aparelhos usam a planilha.
