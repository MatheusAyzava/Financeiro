import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './styles.css';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GOOGLE_SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const GOOGLE_SHEET_RANGE = import.meta.env.VITE_GOOGLE_SHEET_RANGE || 'Lancamentos!A:J';
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

const accounts = ['Banco do Brasil', 'Nubank', 'Carteira'];
const defaultCategories = [
  'Alimentacao',
  'Transporte',
  'Saude',
  'Educacao',
  'Despesas Pessoais',
  'Impostos e Taxas',
  'Salario',
  'Dividas e Obrigacoes',
  'Emprestimos',
];
const defaultPeople = ['Eu', 'Matheus', 'Alessandra'];
const defaultCards = ['Banco do Brasil', 'Nubank', 'Cartao emprestado'];

const sampleTransactions = [
  {
    date: '2026-06-23',
    description: 'Livro Faculdade',
    category: 'Educacao',
    account: 'Banco do Brasil',
    amount: -150,
  },
  {
    date: '2026-06-23',
    description: 'Combustivel',
    category: 'Transporte',
    account: 'Banco do Brasil',
    amount: -200,
  },
  {
    date: '2026-06-23',
    description: 'Remedios',
    category: 'Saude',
    account: 'Banco do Brasil',
    amount: -55.2,
  },
  {
    date: '2026-06-23',
    description: 'Nao informado',
    category: 'Alimentacao',
    account: 'Banco do Brasil',
    amount: -20,
  },
  {
    date: '2026-06-22',
    description: 'Nao informado',
    category: 'Alimentacao',
    account: 'Nubank',
    amount: -20,
  },
  {
    date: '2026-06-21',
    description: 'Nao informado',
    category: 'Alimentacao',
    account: 'Banco do Brasil',
    amount: -20,
  },
  {
    date: '2026-06-20',
    description: 'Supermercado',
    category: 'Alimentacao',
    account: 'Banco do Brasil',
    amount: -1400,
  },
  {
    date: '2026-06-18',
    description: 'Restaurante',
    category: 'Alimentacao',
    account: 'Nubank',
    amount: -60,
  },
  {
    date: '2026-06-17',
    description: 'Uber',
    category: 'Transporte',
    account: 'Nubank',
    amount: -28.5,
  },
  {
    date: '2026-06-15',
    description: 'Salario',
    category: 'Salario',
    account: 'Banco do Brasil',
    amount: 3150,
  },
  {
    date: '2026-06-13',
    description: 'Academia',
    category: 'Despesas Pessoais',
    account: 'Nubank',
    amount: -89.9,
  },
  {
    date: '2026-06-11',
    description: 'Cinema',
    category: 'Despesas Pessoais',
    account: 'Nubank',
    amount: -45,
  },
  {
    date: '2026-06-05',
    description: 'IPTU',
    category: 'Impostos e Taxas',
    account: 'Banco do Brasil',
    amount: -229.4,
  },
];

const budgets = [
  { category: 'Alimentacao', limit: 1600 },
  { category: 'Despesas Pessoais', limit: 400 },
  { category: 'Dividas e Obrigacoes', limit: 1200 },
  { category: 'Educacao', limit: 300 },
  { category: 'Transporte', limit: 450 },
  { category: 'Saude', limit: 250 },
];

const defaultCardBills = [
  { id: 'card-nubank', name: 'Nubank', dueDay: 8, closingDay: 1, amount: 0, paidMonths: [] },
  { id: 'card-banco-brasil', name: 'Banco do Brasil', dueDay: 15, closingDay: 8, amount: 0, paidMonths: [] },
];

const defaultReminders = [
  { id: 'reminder-mei', title: 'Pagar MEI', dueDay: 20, amount: 76.9, recurrence: 'Mensal', paidMonths: [] },
  { id: 'reminder-internet', title: 'Internet', dueDay: 10, amount: 99.9, recurrence: 'Mensal', paidMonths: [] },
];

const defaultGoals = [
  { id: 'goal-emergency', title: 'Reserva de emergencia', target: 10000, current: 1200 },
  { id: 'goal-trip', title: 'Viagem', target: 3000, current: 450 },
];

const defaultDebts = [
  {
    id: 'debt-example',
    title: 'Dinheiro emprestado',
    person: 'Matheus',
    amount: 200,
    dueDate: '2026-06-30',
    type: 'A receber',
    status: 'Pendente',
  },
];

const colors = ['#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultTransaction() {
  return {
    type: 'expense',
    date: today(),
    description: '',
    category: 'Alimentacao',
    account: 'Carteira',
    amount: '',
    person: 'Eu',
    card: '',
    status: 'Debito',
    installments: 1,
    notes: '',
  };
}

function normalizeTransaction(transaction) {
  const amount = Number(transaction.amount) || 0;
  const rawStatus = normalizeText(transaction.status);
  const normalizedStatus = ['Credito', 'Debito'].includes(rawStatus)
    ? rawStatus
    : amount >= 0
      ? 'Credito'
      : 'Debito';

  return {
    date: normalizeDate(transaction.date),
    description: normalizeText(transaction.description) || 'Nao informado',
    category: normalizeText(transaction.category) || 'Sem categoria',
    account: normalizeText(transaction.account) || 'Sem conta',
    amount,
    person: normalizeText(transaction.person) || 'Eu',
    card: normalizeText(transaction.card),
    status: normalizedStatus,
    installments: Number(transaction.installments) || 1,
    notes: normalizeText(transaction.notes),
    sheetRow: transaction.sheetRow ? Number(transaction.sheetRow) : null,
  };
}

function getSavedList(key, fallback) {
  const saved = localStorage.getItem(key);

  try {
    const parsed = saved ? JSON.parse(saved) : [];
    return [...new Set([...fallback, ...parsed].filter(Boolean))];
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function getSavedItems(key, fallback) {
  const saved = localStorage.getItem(key);

  try {
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function saveItems(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function addMonths(dateValue, monthsToAdd) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toISOString().slice(0, 10);
}

function expandInstallments(transaction) {
  const installments = Math.max(Number(transaction.installments) || 1, 1);

  if (installments === 1) return [normalizeTransaction(transaction)];

  const installmentAmount = transaction.amount / installments;
  const startsNextMonth = transaction.amount < 0;

  return Array.from({ length: installments }, (_, index) =>
    normalizeTransaction({
      ...transaction,
      date: addMonths(transaction.date, startsNextMonth ? index + 1 : index),
      amount: installmentAmount,
      description: `${transaction.description || 'Lancamento'} (${index + 1}/${installments})`,
      installments,
      installmentNumber: index + 1,
    }),
  );
}

function isExpandedInstallment(description, installments) {
  return new RegExp(`\\(\\d+/${installments}\\)$`).test(normalizeText(description));
}

function expandSheetInstallments(transaction) {
  const installments = Math.max(Number(transaction.installments) || 1, 1);

  if (installments === 1 || isExpandedInstallment(transaction.description, installments)) {
    return [transaction];
  }

  const installmentAmount = transaction.amount / installments;

  return Array.from({ length: installments }, (_, index) =>
    normalizeTransaction({
      ...transaction,
      date: addMonths(transaction.date, transaction.amount < 0 ? index + 1 : index),
      amount: installmentAmount,
      description: `${transaction.description} (${index + 1}/${installments})`,
      sheetRow: transaction.sheetRow,
    }),
  );
}

function getMonthlyMetrics(transactions, month) {
  const monthly = transactions.filter((item) => monthKey(item.date) === month);
  const income = monthly.filter((item) => item.amount > 0).reduce((total, item) => total + item.amount, 0);
  const expenses = monthly.filter((item) => item.amount < 0).reduce((total, item) => total + Math.abs(item.amount), 0);

  return {
    income,
    expenses,
    balance: income - expenses,
    count: monthly.length,
  };
}

function previousMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((field) => `"${String(field ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
}

function downloadTextFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getMonthDueDate(month, dueDay) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const safeDay = Math.min(Math.max(Number(dueDay) || 1, 1), lastDay);

  return `${month}-${String(safeDay).padStart(2, '0')}`;
}

function getDueStatus(dueDate, paid) {
  if (paid) return 'Pago';

  const current = new Date(`${today()}T12:00:00`);
  const due = new Date(`${dueDate}T12:00:00`);
  const diffDays = Math.ceil((due - current) / 86400000);

  if (diffDays < 0) return 'Vencido';
  if (diffDays === 0) return 'Vence hoje';
  if (diffDays <= 7) return `Vence em ${diffDays} dias`;
  return 'Pendente';
}

function getDueItems(cardBills, reminders, selectedMonth) {
  const cardsDue = cardBills.map((item) => {
    const dueDate = getMonthDueDate(selectedMonth, item.dueDay);
    const paid = item.paidMonths?.includes(selectedMonth);

    return {
      ...item,
      kind: 'Cartao',
      title: `Fatura ${item.name}`,
      dueDate,
      paid,
      status: getDueStatus(dueDate, paid),
    };
  });

  const remindersDue = reminders.map((item) => {
    const dueDate = getMonthDueDate(selectedMonth, item.dueDay);
    const paid = item.paidMonths?.includes(selectedMonth);

    return {
      ...item,
      kind: 'Lembrete',
      dueDate,
      paid,
      status: getDueStatus(dueDate, paid),
    };
  });

  return [...cardsDue, ...remindersDue].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function getInitialSheetsConfig() {
  const saved = localStorage.getItem('fincontrol:sheets-config');
  let localConfig = {};

  try {
    localConfig = saved ? JSON.parse(saved) : {};
  } catch {
    localStorage.removeItem('fincontrol:sheets-config');
  }

  return {
    apiKey: localConfig.apiKey || GOOGLE_API_KEY || '',
    sheetId: localConfig.sheetId || GOOGLE_SHEET_ID || '',
    range: localConfig.range || GOOGLE_SHEET_RANGE,
    scriptUrl: localConfig.scriptUrl || GOOGLE_SCRIPT_URL || '',
  };
}

function extractSheetId(value) {
  const text = normalizeText(value);
  const match = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || text;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function parseCurrency(value) {
  if (typeof value === 'number') return value;
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.');
  return Number(normalized) || 0;
}

function normalizeDate(value) {
  const text = normalizeText(value);
  const brDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (brDate) {
    const [, day, month, year] = brDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (isoDate) {
    return isoDate[0];
  }

  return text;
}

function parseSheetRows(rows) {
  return rows
    .map((row, index) => ({ row, sheetRow: index + 1 }))
    .slice(1)
    .filter(({ row }) => row.some(Boolean))
    .flatMap(({ row, sheetRow }) => {
      const transaction = normalizeTransaction({
        date: row[0],
        description: row[1],
        category: row[2],
        account: row[3],
        amount: parseCurrency(row[4]),
        person: row[5],
        card: row[6],
        status: row[7],
        installments: row[8],
        notes: row[9],
        sheetRow,
      });

      return expandSheetInstallments(transaction);
    });
}

function fetchScriptJsonp(scriptUrl, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `fincontrolCallback${Date.now()}${Math.random().toString(36).slice(2)}`;
    const url = new URL(scriptUrl);

    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    url.searchParams.set('callback', callbackName);

    const script = document.createElement('script');
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Nao foi possivel ler via Google Apps Script.'));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function fetchScriptTransactions(config) {
  const scriptUrl = normalizeText(config.scriptUrl);
  if (!scriptUrl) return null;

  const data = await fetchScriptJsonp(scriptUrl, { action: 'listTransactions' });
  return parseSheetRows(data.values || []);
}

async function fetchSheetTransactions(config) {
  const apiKey = normalizeText(config.apiKey);
  const sheetId = extractSheetId(config.sheetId);
  const rangeValue = normalizeText(config.range) || GOOGLE_SHEET_RANGE;

  if (!apiKey || !sheetId) return null;

  const range = encodeURIComponent(rangeValue);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Nao foi possivel ler a planilha do Google Sheets.');
  }

  const data = await response.json();
  return parseSheetRows(data.values || []);
}

async function appendTransactionsToSheet(config, transactionsToAppend) {
  const scriptUrl = normalizeText(config.scriptUrl);
  if (!scriptUrl) return;

  const payload = JSON.stringify({
    action: 'appendTransactions',
    transactions: transactionsToAppend.map((item) => [
      item.date,
      item.description,
      item.category,
      item.account,
      item.amount,
      item.person,
      item.card,
      item.status,
      item.installments,
      item.notes,
    ]),
  });

  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({ payload }),
  });
}

async function deleteTransactionFromSheet(config, transaction) {
  const scriptUrl = normalizeText(config.scriptUrl);
  if (!scriptUrl) return;

  const payload = JSON.stringify({
    action: 'deleteTransaction',
    sheetRow: transaction.sheetRow,
    transaction: [
      transaction.date,
      transaction.description,
      transaction.category,
      transaction.account,
      transaction.amount,
      transaction.person,
      transaction.card,
      transaction.status,
      transaction.installments,
      transaction.notes,
    ],
  });

  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({ payload }),
  });
}

async function updateTransactionInSheet(config, transaction) {
  const scriptUrl = normalizeText(config.scriptUrl);
  if (!scriptUrl) return;

  const payload = JSON.stringify({
    action: 'updateTransaction',
    sheetRow: transaction.sheetRow,
    transaction: [
      transaction.date,
      transaction.description,
      transaction.category,
      transaction.account,
      transaction.amount,
      transaction.person,
      transaction.card,
      transaction.status,
      transaction.installments,
      transaction.notes,
    ],
  });

  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({ payload }),
  });
}

function currency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(value) {
  if (!value) return '';
  const normalized = normalizeDate(value);
  const date = new Date(`${normalized}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

function monthKey(value) {
  return value ? value.slice(0, 7) : '';
}

function App() {
  const [activePage, setActivePage] = useState('overview');
  const [transactions, setTransactions] = useState(() =>
    getSavedItems('fincontrol:transactions', []).map(normalizeTransaction),
  );
  const [search, setSearch] = useState('');
  const [personFilter, setPersonFilter] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [syncStatus, setSyncStatus] = useState('Usando dados de exemplo.');
  const [sheetsConfig, setSheetsConfig] = useState(getInitialSheetsConfig);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [people, setPeople] = useState(() => getSavedList('fincontrol:people', defaultPeople));
  const [cards, setCards] = useState(() => getSavedList('fincontrol:cards', defaultCards));
  const [cardBills, setCardBills] = useState(() => getSavedItems('fincontrol:card-bills', defaultCardBills));
  const [reminders, setReminders] = useState(() => getSavedItems('fincontrol:reminders', defaultReminders));
  const [goals, setGoals] = useState(() => getSavedItems('fincontrol:goals', defaultGoals));
  const [debts, setDebts] = useState(() => getSavedItems('fincontrol:debts', defaultDebts));

  function loadSheetData(config = sheetsConfig) {
    if (!config.scriptUrl && (!config.apiKey || !config.sheetId)) {
      setSyncStatus('Configure Google Sheets para sincronizar.');
      return;
    }

    setSyncStatus('Buscando dados no Google Sheets...');

    const source = config.scriptUrl ? fetchScriptTransactions(config) : fetchSheetTransactions(config);

    source
      .then((sheetTransactions) => {
        if (sheetTransactions?.length) {
          setTransactions(sheetTransactions);
          saveItems('fincontrol:transactions', sheetTransactions);
          setSyncStatus('Dados carregados do Google Sheets.');
          return;
        }

        setTransactions([]);
        saveItems('fincontrol:transactions', []);
        setSyncStatus('Planilha conectada, mas ainda sem lancamentos.');
      })
      .catch((error) => {
        if (config.scriptUrl && config.apiKey && config.sheetId) {
          fetchSheetTransactions(config)
            .then((sheetTransactions) => {
              const rows = sheetTransactions || [];
              setTransactions(rows);
              saveItems('fincontrol:transactions', rows);
              setSyncStatus(rows.length ? 'Dados carregados do Google Sheets.' : 'Planilha conectada, mas ainda sem lancamentos.');
            })
            .catch(() => setSyncStatus(error.message));
          return;
        }

        setSyncStatus(error.message);
      });
  }

  function saveSheetsConfig(nextConfig) {
    const normalizedConfig = {
      ...nextConfig,
      sheetId: extractSheetId(nextConfig.sheetId),
    };

    localStorage.setItem('fincontrol:sheets-config', JSON.stringify(normalizedConfig));
    setSheetsConfig(normalizedConfig);
    loadSheetData(normalizedConfig);
  }

  useEffect(() => {
    loadSheetData(sheetsConfig);
  }, []);

  const monthlyTransactions = useMemo(
    () => transactions.filter((item) => monthKey(item.date) === selectedMonth),
    [transactions, selectedMonth],
  );

  const summary = useMemo(() => {
    const income = monthlyTransactions
      .filter((item) => item.amount > 0)
      .reduce((total, item) => total + item.amount, 0);
    const expenses = monthlyTransactions
      .filter((item) => item.amount < 0)
      .reduce((total, item) => total + Math.abs(item.amount), 0);
    const totalBalance = transactions.reduce((total, item) => total + item.amount, 0);

    return {
      income,
      expenses,
      monthBalance: income - expenses,
      totalBalance,
    };
  }, [monthlyTransactions, transactions]);

  const accountBalances = useMemo(
    () =>
      accounts.map((account) => ({
        name: account,
        balance: transactions
          .filter((item) => item.account === account)
          .reduce((total, item) => total + item.amount, 0),
      })),
    [transactions],
  );

  const expensesByCategory = useMemo(() => {
    const totals = monthlyTransactions
      .filter((item) => item.amount < 0)
      .reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + Math.abs(item.amount);
        return acc;
      }, {});

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyTransactions]);

  const dailyCashflow = useMemo(() => {
    const totals = monthlyTransactions.reduce((acc, item) => {
      const label = formatDate(item.date).slice(0, 5);
      acc[label] = (acc[label] || 0) + item.amount;
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([date, value]) => ({ date, value }))
      .reverse();
  }, [monthlyTransactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.toLowerCase();
    return monthlyTransactions.filter((item) => {
      const matchesSearch = [item.description, item.category, item.account, item.person, item.card, item.status].some(
        (field) =>
          String(field || '')
            .toLowerCase()
            .includes(query),
      );
      const matchesPerson = personFilter === 'Todos' || item.person === personFilter;

      return matchesSearch && matchesPerson;
    });
  }, [monthlyTransactions, personFilter, search]);

  const dueItems = useMemo(() => getDueItems(cardBills, reminders, selectedMonth), [cardBills, reminders, selectedMonth]);
  const nextDueItems = useMemo(() => dueItems.filter((item) => !item.paid).slice(0, 4), [dueItems]);
  const receivables = useMemo(
    () =>
      transactions
        .filter((item) => item.amount < 0 && item.person && item.person.toLowerCase() !== 'eu')
        .map((item) => ({
          ...item,
          receivableAmount: Math.abs(item.amount),
          receivableStatus: item.status === 'Reembolsado' ? 'Quitado' : 'Em aberto',
        })),
    [transactions],
  );
  const monthlyReport = useMemo(() => {
    const current = getMonthlyMetrics(transactions, selectedMonth);
    const previous = getMonthlyMetrics(transactions, previousMonth(selectedMonth));

    return {
      current,
      previous,
      expensesDiff: current.expenses - previous.expenses,
      incomeDiff: current.income - previous.income,
      balanceDiff: current.balance - previous.balance,
    };
  }, [selectedMonth, transactions]);

  function refreshSheetSoon(delay = 1200) {
    if (!sheetsConfig.scriptUrl && (!sheetsConfig.apiKey || !sheetsConfig.sheetId)) return;
    window.setTimeout(() => loadSheetData(sheetsConfig), delay);
  }

  function addTransaction() {
    setEditingTransaction(null);
    setActivePage('transactions');
    setIsTransactionModalOpen(true);
  }

  function closeTransactionModal() {
    setEditingTransaction(null);
    setIsTransactionModalOpen(false);
  }

  function editTransaction(indexToEdit) {
    setEditingTransaction(filteredTransactions[indexToEdit]);
    setActivePage('transactions');
    setIsTransactionModalOpen(true);
  }

  function saveTransaction(transaction) {
    if (editingTransaction) {
      const amount = Number(transaction.amount) || 0;
      const normalized = normalizeTransaction({
        ...transaction,
        amount,
        sheetRow: editingTransaction.sheetRow,
      });
      const nextTransactions = transactions.map((item) => (item === editingTransaction ? normalized : item));

      setTransactions(nextTransactions);
      saveItems('fincontrol:transactions', nextTransactions);
      setEditingTransaction(null);
      setIsTransactionModalOpen(false);

      updateTransactionInSheet(sheetsConfig, normalized)
        .then(() => {
          if (sheetsConfig.scriptUrl) {
            setSyncStatus('Lancamento atualizado no Google Sheets.');
            refreshSheetSoon();
          }
        })
        .catch(() => setSyncStatus('Lancamento atualizado no app, mas nao foi atualizado na planilha.'));
      return;
    }

    const installments = expandInstallments(transaction);
    const nextTransactions = [...installments, ...transactions];
    setTransactions(nextTransactions);
    saveItems('fincontrol:transactions', nextTransactions);

    const nextPeople = [...new Set([...people, ...installments.map((item) => item.person)].filter(Boolean))];
    const nextCards = [...new Set([...cards, ...installments.map((item) => item.card)].filter(Boolean))];

    setPeople(nextPeople);
    setCards(nextCards);
    localStorage.setItem('fincontrol:people', JSON.stringify(nextPeople));
    localStorage.setItem('fincontrol:cards', JSON.stringify(nextCards));
    setIsTransactionModalOpen(false);
    setSelectedMonth(monthKey(installments[0].date) || selectedMonth);

    appendTransactionsToSheet(sheetsConfig, installments)
      .then(() => {
        if (sheetsConfig.scriptUrl) {
          setSyncStatus('Lancamento enviado para o Google Sheets.');
          refreshSheetSoon();
        }
      })
      .catch(() => setSyncStatus('Lancamento salvo no app, mas nao foi enviado para a planilha.'));
  }

  function removeTransaction(indexToRemove) {
    const itemToRemove = filteredTransactions[indexToRemove];
    const nextTransactions = transactions.filter((item) => item !== itemToRemove);
    setTransactions(nextTransactions);
    saveItems('fincontrol:transactions', nextTransactions);

    deleteTransactionFromSheet(sheetsConfig, itemToRemove)
      .then(() => {
        if (sheetsConfig.scriptUrl) {
          setSyncStatus('Lancamento excluido do Google Sheets.');
          refreshSheetSoon();
        }
      })
      .catch(() => setSyncStatus('Lancamento excluido do app, mas nao foi excluido da planilha.'));
  }

  function addCardBill(cardBill) {
    const next = [
      ...cardBills,
      {
        id: `card-${Date.now()}`,
        name: normalizeText(cardBill.name) || 'Novo cartao',
        dueDay: Number(cardBill.dueDay) || 1,
        closingDay: Number(cardBill.closingDay) || 1,
        amount: parseCurrency(cardBill.amount),
        paidMonths: [],
      },
    ];

    setCardBills(next);
    saveItems('fincontrol:card-bills', next);
  }

  function updateCardBill(cardId, changes) {
    const next = cardBills.map((cardBill) =>
      cardBill.id === cardId
        ? {
            ...cardBill,
            name: normalizeText(changes.name) || cardBill.name,
            dueDay: Number(changes.dueDay) || cardBill.dueDay,
            closingDay: Number(changes.closingDay) || cardBill.closingDay,
            amount: parseCurrency(changes.amount),
          }
        : cardBill,
    );

    setCardBills(next);
    saveItems('fincontrol:card-bills', next);
  }

  function removeCardBill(cardId) {
    const next = cardBills.filter((cardBill) => cardBill.id !== cardId);
    setCardBills(next);
    saveItems('fincontrol:card-bills', next);
  }

  function addReminder(reminder) {
    const next = [
      ...reminders,
      {
        id: `reminder-${Date.now()}`,
        title: normalizeText(reminder.title) || 'Novo lembrete',
        dueDay: Number(reminder.dueDay) || 1,
        amount: parseCurrency(reminder.amount),
        recurrence: normalizeText(reminder.recurrence) || 'Mensal',
        paidMonths: [],
      },
    ];

    setReminders(next);
    saveItems('fincontrol:reminders', next);
  }

  function toggleDuePaid(item) {
    const updatePaidMonths = (current) => {
      const paidMonths = current.paidMonths || [];
      const nextPaidMonths = paidMonths.includes(selectedMonth)
        ? paidMonths.filter((month) => month !== selectedMonth)
        : [...paidMonths, selectedMonth];

      return { ...current, paidMonths: nextPaidMonths };
    };

    if (item.kind === 'Cartao') {
      const next = cardBills.map((cardBill) => (cardBill.id === item.id ? updatePaidMonths(cardBill) : cardBill));
      setCardBills(next);
      saveItems('fincontrol:card-bills', next);
      return;
    }

    const next = reminders.map((reminder) => (reminder.id === item.id ? updatePaidMonths(reminder) : reminder));
    setReminders(next);
    saveItems('fincontrol:reminders', next);
  }

  function addGoal(goal) {
    const next = [
      ...goals,
      {
        id: `goal-${Date.now()}`,
        title: normalizeText(goal.title) || 'Nova meta',
        target: parseCurrency(goal.target),
        current: parseCurrency(goal.current),
      },
    ];

    setGoals(next);
    saveItems('fincontrol:goals', next);
  }

  function addDebt(debt) {
    const next = [
      ...debts,
      {
        id: `debt-${Date.now()}`,
        title: normalizeText(debt.title) || 'Divida',
        person: normalizeText(debt.person) || 'Nao informado',
        amount: parseCurrency(debt.amount),
        dueDate: normalizeDate(debt.dueDate) || today(),
        type: normalizeText(debt.type) || 'A receber',
        status: 'Pendente',
      },
    ];

    setDebts(next);
    saveItems('fincontrol:debts', next);
  }

  function toggleDebtPaid(debtId) {
    const next = debts.map((debt) => (debt.id === debtId ? { ...debt, status: debt.status === 'Pago' ? 'Pendente' : 'Pago' } : debt));
    setDebts(next);
    saveItems('fincontrol:debts', next);
  }

  function exportBackup() {
    downloadTextFile(
      `fincontrol-backup-${today()}.json`,
      JSON.stringify({ transactions, cardBills, reminders, goals, debts, people, cards }, null, 2),
      'application/json',
    );
  }

  function exportTransactionsCsv() {
    const header = ['Data', 'Descricao', 'Categoria', 'Conta', 'Valor', 'Quem usou', 'Cartao', 'Status', 'Parcelas', 'Observacao'];
    const rows = transactions.map((item) => [
      item.date,
      item.description,
      item.category,
      item.account,
      item.amount,
      item.person,
      item.card,
      item.status,
      item.installments,
      item.notes,
    ]);

    downloadTextFile(`fincontrol-lancamentos-${today()}.csv`, toCsv([header, ...rows]), 'text/csv');
  }

  function importBackup(data) {
    if (data.transactions) {
      const next = data.transactions.map(normalizeTransaction);
      setTransactions(next);
      saveItems('fincontrol:transactions', next);
    }
    if (data.cardBills) {
      setCardBills(data.cardBills);
      saveItems('fincontrol:card-bills', data.cardBills);
    }
    if (data.reminders) {
      setReminders(data.reminders);
      saveItems('fincontrol:reminders', data.reminders);
    }
    if (data.goals) {
      setGoals(data.goals);
      saveItems('fincontrol:goals', data.goals);
    }
    if (data.debts) {
      setDebts(data.debts);
      saveItems('fincontrol:debts', data.debts);
    }
  }

  return (
    <div className="app">
      <Sidebar activePage={activePage} setActivePage={setActivePage} syncStatus={syncStatus} />
      <main className="main">
        <Header />
        <section className="content">
          {activePage === 'overview' && (
            <Overview
              summary={summary}
              expensesByCategory={expensesByCategory}
              dailyCashflow={dailyCashflow}
              accountBalances={accountBalances}
              nextDueItems={nextDueItems}
              monthlyTransactions={monthlyTransactions}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          )}
          {activePage === 'transactions' && (
            <Transactions
              transactions={filteredTransactions}
              people={people}
              personFilter={personFilter}
              search={search}
              editTransaction={editTransaction}
              selectedMonth={selectedMonth}
              setPersonFilter={setPersonFilter}
              setSearch={setSearch}
              setSelectedMonth={setSelectedMonth}
              removeTransaction={removeTransaction}
            />
          )}
          {activePage === 'cards' && (
            <CardsPage
              cardBills={cardBills}
              removeCardBill={removeCardBill}
              receivables={receivables}
              selectedMonth={selectedMonth}
              transactions={monthlyTransactions}
              updateCardBill={updateCardBill}
            />
          )}
          {activePage === 'planning' && (
            <Planning
              expensesByCategory={expensesByCategory}
              dueItems={dueItems}
              debts={debts}
              goals={goals}
              addCardBill={addCardBill}
              addDebt={addDebt}
              addGoal={addGoal}
              addReminder={addReminder}
              removeCardBill={removeCardBill}
              toggleDebtPaid={toggleDebtPaid}
              toggleDuePaid={toggleDuePaid}
              updateCardBill={updateCardBill}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          )}
          {activePage === 'reports' && (
            <Reports report={monthlyReport} selectedMonth={selectedMonth} transactions={monthlyTransactions} />
          )}
          {activePage === 'settings' && (
            <Settings
              config={sheetsConfig}
              exportBackup={exportBackup}
              exportTransactionsCsv={exportTransactionsCsv}
              importBackup={importBackup}
              onSave={saveSheetsConfig}
              syncStatus={syncStatus}
            />
          )}
          {activePage === 'help' && <Help />}
        </section>
      </main>
      <button className="fab" type="button" onClick={addTransaction} aria-label="Adicionar lancamento">
        +
      </button>
      {isTransactionModalOpen && (
        <TransactionModal
          cards={cards}
          categories={defaultCategories}
          initialTransaction={editingTransaction}
          people={people}
          onClose={closeTransactionModal}
          onSave={saveTransaction}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="topbar-icon">[]</span>
        Controle de Financas Pessoal
      </div>
    </header>
  );
}

function Sidebar({ activePage, setActivePage, syncStatus }) {
  const items = [
    ['overview', 'Visao Geral', 'OV'],
    ['transactions', 'Lancamentos', 'LA'],
    ['cards', 'Cartoes', 'CA'],
    ['planning', 'Planejamento', 'PL'],
    ['reports', 'Relatorios', 'RE'],
    ['settings', 'Configuracoes', 'CF'],
    ['help', 'Ajuda', '?'],
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">FC</div>
        <div>
          <strong>FinControl</strong>
          <span>Suas financas no controle</span>
        </div>
      </div>

      <nav className="nav">
        {items.map(([id, label, icon]) => (
          <button
            className={activePage === id ? 'nav-item active' : 'nav-item'}
            key={id}
            type="button"
            onClick={() => setActivePage(id)}
          >
            <span>{icon}</span>
            {label}
            {activePage === id && <small />}
          </button>
        ))}
      </nav>

      <div className="sync-card">
        <strong>Google Sheets</strong>
        <span>{syncStatus}</span>
      </div>
    </aside>
  );
}

function Overview({
  summary,
  expensesByCategory,
  dailyCashflow,
  accountBalances,
  nextDueItems,
  monthlyTransactions,
  selectedMonth,
  setSelectedMonth,
}) {
  const totalExpenses = expensesByCategory.reduce((total, item) => total + item.value, 0);
  const budgetRows = getBudgetRows(expensesByCategory);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Visao Geral</h1>
          <p>Resumo financeiro do periodo selecionado</p>
        </div>
        <div className="period-controls">
          <button type="button" className="pill active">
            Mensal
          </button>
          <button type="button" className="pill">
            Anual
          </button>
          <label className="month-label">
            Periodo:
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="summary-grid">
        <MetricCard label="Receitas do Mes" value={summary.income} tone="green" icon="IN" />
        <MetricCard label="Despesas do Mes" value={summary.expenses} tone="red" icon="OUT" />
        <MetricCard label="Balanco do Mes" value={summary.monthBalance} tone="green" icon="BAL" />
        <MetricCard label="Saldo Total (Contas)" value={summary.totalBalance} tone="blue" icon="TOT" />
      </div>

      {nextDueItems.length > 0 && (
        <section className="due-strip">
          <div>
            <strong>Proximos vencimentos</strong>
            <span>Contas e faturas pendentes para voce nao esquecer.</span>
          </div>
          <div className="due-strip-list">
            {nextDueItems.map((item) => (
              <article key={`${item.kind}-${item.id}`}>
                <small>{item.kind}</small>
                <strong>{item.title}</strong>
                <span>
                  Dia {formatDate(item.dueDate)} - {item.status}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="dashboard-grid">
        <Panel title="Despesas por Categoria">
          <div className="chart-row">
            <ResponsiveContainer width="55%" height={210}>
              <PieChart>
                <Pie data={expensesByCategory} innerRadius={52} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => currency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="legend">
              {expensesByCategory.map((item, index) => (
                <div key={item.name} className="legend-item">
                  <span style={{ background: colors[index % colors.length] }} />
                  <p>{item.name}</p>
                  <strong>{totalExpenses ? `${((item.value / totalExpenses) * 100).toFixed(1)}%` : '0%'}</strong>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Fluxo de Caixa Diario">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyCashflow}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => currency(value)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {dailyCashflow.map((entry) => (
                  <Cell key={entry.date} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Saldos das Contas">
          <div className="account-list">
            {accountBalances.map((account) => (
              <div className="account-item" key={account.name}>
                <div>
                  <span>{account.name}</span>
                  <strong>{currency(account.balance)}</strong>
                </div>
                <progress value={Math.max(account.balance, 0)} max={Math.max(summary.totalBalance, 1)} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Orcado vs. Gasto">
          <BudgetList budgetRows={budgetRows} />
        </Panel>
      </div>

      <p className="muted">{monthlyTransactions.length} lancamentos no periodo selecionado.</p>
    </div>
  );
}

function MetricCard({ label, value, tone, icon }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div>
        <strong className={tone}>{currency(value)}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function TransactionModal({ cards, categories, initialTransaction, people, onClose, onSave }) {
  const [draft, setDraft] = useState(() => {
    if (!initialTransaction) return getDefaultTransaction();

    return {
      ...initialTransaction,
      amount: Math.abs(initialTransaction.amount),
      type: initialTransaction.amount >= 0 ? 'income' : 'expense',
      status: initialTransaction.status || (initialTransaction.amount >= 0 ? 'Credito' : 'Debito'),
    };
  });

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateType(type) {
    setDraft((current) => ({
      ...current,
      type,
      status: type === 'income' ? 'Credito' : 'Debito',
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const amount = Math.abs(parseCurrency(draft.amount));
    const signedAmount = draft.type === 'income' ? amount : -amount;
    const status = draft.status || (draft.type === 'income' ? 'Credito' : 'Debito');

    onSave({
      ...draft,
      amount: signedAmount,
      status,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="transaction-modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <h2>{initialTransaction ? 'Editar lancamento' : 'Novo lancamento'}</h2>
            <p>{initialTransaction ? 'Edite os dados deste lancamento.' : 'Registre compra, receita ou uso emprestado do cartao.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </div>

        <div className="type-toggle">
          <label>
            <input
              checked={draft.type !== 'income'}
              name="transaction-type"
              type="radio"
              onChange={() => updateType('expense')}
            />
            Despesa
          </label>
          <label>
            <input
              checked={draft.type === 'income'}
              name="transaction-type"
              type="radio"
              onChange={() => updateType('income')}
            />
            Receita
          </label>
        </div>

        <label className="amount-field">
          Valor do lancamento
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0,00"
            required
            value={draft.amount}
            onChange={(event) => updateDraft('amount', event.target.value)}
          />
        </label>

        <div className="form-grid">
          <label>
            Descricao
            <input
              placeholder="Ex: Supermercado, Uber, remedio"
              value={draft.description}
              onChange={(event) => updateDraft('description', event.target.value)}
            />
          </label>
          <label>
            Categoria
            <input
              list="categories-list"
              value={draft.category}
              onChange={(event) => updateDraft('category', event.target.value)}
            />
          </label>
          <label>
            Data
            <input type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} />
          </label>
          <label>
            Conta
            <input
              list="accounts-list"
              value={draft.account}
              onChange={(event) => updateDraft('account', event.target.value)}
            />
          </label>
          <label>
            Quem usou
            <input
              list="people-list"
              placeholder="Ex: Matheus, Alessandra"
              value={draft.person}
              onChange={(event) => updateDraft('person', event.target.value)}
            />
          </label>
          <label>
            Cartao usado
            <input
              list="cards-list"
              placeholder="Ex: Nubank, BB Visa"
              value={draft.card}
              onChange={(event) => updateDraft('card', event.target.value)}
            />
          </label>
          <label>
            Status
            <select value={draft.status} onChange={(event) => updateDraft('status', event.target.value)}>
              <option>Debito</option>
              <option>Credito</option>
            </select>
          </label>
          <label>
            Parcelas
            <input
              max="60"
              min="1"
              type="number"
              value={draft.installments}
              onChange={(event) => updateDraft('installments', event.target.value)}
            />
            <small>Despesas parceladas entram a partir do mes seguinte, ate 60x.</small>
          </label>
        </div>

        <label>
          Observacao
          <textarea
            placeholder="Ex: emprestei o cartao, combinar pagamento dia 10"
            value={draft.notes}
            onChange={(event) => updateDraft('notes', event.target.value)}
          />
        </label>

        <datalist id="categories-list">
          {categories.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="accounts-list">
          {accounts.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="people-list">
          {people.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <datalist id="cards-list">
          {cards.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit">{initialTransaction ? 'Salvar alteracoes' : 'Salvar lancamento'}</button>
        </div>
      </form>
    </div>
  );
}

function Transactions({
  transactions,
  people,
  personFilter,
  search,
  editTransaction,
  selectedMonth,
  setPersonFilter,
  setSearch,
  setSelectedMonth,
  removeTransaction,
}) {
  const borrowedSummary = useMemo(() => {
    const totals = transactions
      .filter((item) => item.amount < 0 && item.person && item.person.toLowerCase() !== 'eu')
      .reduce((acc, item) => {
        acc[item.person] = (acc[item.person] || 0) + Math.abs(item.amount);
        return acc;
      }, {});

    return Object.entries(totals).map(([person, amount]) => ({ person, amount }));
  }, [transactions]);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Meus Lancamentos</h1>
        </div>
        <label className="month-label">
          Periodo:
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </label>
      </div>

      <div className="toolbar">
        <label className="search-box">
          <span>Q</span>
          <input
            type="search"
            placeholder="Buscar na lista atual por descricao..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button type="button" className="filter-button">
          Filtros
        </button>
        <select value={personFilter} onChange={(event) => setPersonFilter(event.target.value)}>
          <option>Todos</option>
          {people.map((person) => (
            <option key={person}>{person}</option>
          ))}
        </select>
      </div>

      {borrowedSummary.length > 0 && (
        <div className="borrowed-summary">
          <strong>Cartao emprestado no periodo</strong>
          <div>
            {borrowedSummary.map((item) => (
              <span key={item.person}>
                {item.person}: {currency(item.amount)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descricao</th>
              <th>Categoria</th>
              <th>Conta</th>
              <th>Quem usou</th>
              <th>Cartao</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item, index) => (
              <tr key={`${item.date}-${item.description}-${index}`}>
                <td>{formatDate(item.date)}</td>
                <td className={item.description === 'Nao informado' ? 'empty-value' : ''}>{item.description}</td>
                <td>{item.category}</td>
                <td>{item.account}</td>
                <td>{item.person}</td>
                <td className={item.card ? '' : 'empty-value'}>{item.card || 'Sem cartao'}</td>
                <td>
                  <span className={`status-pill ${item.status.toLowerCase().replace(/\s/g, '-')}`}>
                    {item.status}
                  </span>
                </td>
                <td className={item.amount >= 0 ? 'value income' : 'value expense'}>
                  {item.amount >= 0 ? '+ ' : '- '}
                  {currency(Math.abs(item.amount))}
                  {item.installments > 1 && <small className="installments">/{item.installments}x</small>}
                </td>
                <td className="actions">
                  <button type="button" onClick={() => editTransaction(index)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => removeTransaction(index)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CardsPage({ cardBills, removeCardBill, receivables, selectedMonth, transactions, updateCardBill }) {
  const cardUsage = cardBills.map((card) => {
    const total = transactions
      .filter((item) => item.amount < 0 && (item.card === card.name || item.account === card.name))
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    return { ...card, total };
  });

  const receivablesTotal = receivables
    .filter((item) => monthKey(item.date) === selectedMonth && item.receivableStatus !== 'Quitado')
    .reduce((sum, item) => sum + item.receivableAmount, 0);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Cartoes</h1>
          <p>Faturas, vencimentos e valores a receber de quem usou seu cartao.</p>
        </div>
      </div>

      <div className="card-dashboard">
        {cardUsage.map((card) => (
          <EditableCardPanel card={card} key={card.id} onRemove={removeCardBill} onUpdate={updateCardBill} />
        ))}
      </div>

      <section className="panel large-panel">
        <h2>Contas a receber por pessoa</h2>
        <div className="receivable-total">
          <span>Total em aberto no mes</span>
          <strong>{currency(receivablesTotal)}</strong>
        </div>
        <div className="receivable-list">
          {receivables
            .filter((item) => monthKey(item.date) === selectedMonth)
            .map((item, index) => (
              <article key={`${item.person}-${item.description}-${index}`}>
                <div>
                  <strong>{item.person}</strong>
                  <span>{item.description}</span>
                </div>
                <div>
                  <strong>{currency(item.receivableAmount)}</strong>
                  <span>{item.receivableStatus}</span>
                </div>
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}

function EditableCardPanel({ card, onRemove, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: card.name,
    dueDay: card.dueDay,
    closingDay: card.closingDay,
    amount: card.amount || '',
  });

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onUpdate(card.id, draft);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <form className="credit-card-panel edit-card-form" onSubmit={handleSubmit}>
        <label>
          Nome
          <input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} />
        </label>
        <div className="mini-form-grid">
          <label>
            Vence dia
            <input
              max="31"
              min="1"
              type="number"
              value={draft.dueDay}
              onChange={(event) => updateDraft('dueDay', event.target.value)}
            />
          </label>
          <label>
            Fecha dia
            <input
              max="31"
              min="1"
              type="number"
              value={draft.closingDay}
              onChange={(event) => updateDraft('closingDay', event.target.value)}
            />
          </label>
        </div>
        <label>
          Valor previsto
          <input
            inputMode="decimal"
            value={draft.amount}
            onChange={(event) => updateDraft('amount', event.target.value)}
          />
        </label>
        <div className="card-actions">
          <button type="submit">Salvar</button>
          <button type="button" onClick={() => setIsEditing(false)}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="credit-card-panel">
      <div>
        <span>Cartao</span>
        <h2>{card.name}</h2>
      </div>
      <p>Fecha dia {card.closingDay} - vence dia {card.dueDay}</p>
      <strong>{currency(card.total)}</strong>
      <small>Uso estimado no mes selecionado</small>
      <div className="card-actions">
        <button type="button" onClick={() => setIsEditing(true)}>
          Editar vencimento
        </button>
        <button type="button" onClick={() => onRemove(card.id)}>
          Remover
        </button>
      </div>
    </article>
  );
}

function Planning({
  expensesByCategory,
  dueItems,
  debts,
  goals,
  addCardBill,
  addDebt,
  addGoal,
  addReminder,
  removeCardBill,
  toggleDebtPaid,
  toggleDuePaid,
  updateCardBill,
  selectedMonth,
  setSelectedMonth,
}) {
  const budgetRows = getBudgetRows(expensesByCategory);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Planejamento</h1>
        </div>
      </div>

      <div className="tabs">
        <button className="tab active" type="button">
          Orcamentos
        </button>
        <button className="tab" type="button">
          Recorrentes
        </button>
      </div>

      <label className="month-picker">
        Selecione o Periodo:
        <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
      </label>

      <section className="planning-section">
        <div className="section-heading">
          <div>
            <h2>Vencimentos e lembretes</h2>
            <p>Faturas, MEI e outras contas para nao deixar passar.</p>
          </div>
        </div>

        <div className="due-grid">
          {dueItems.map((item) => (
            <DueItemCard
              item={item}
              key={`${item.kind}-${item.id}`}
              onRemoveCard={removeCardBill}
              onTogglePaid={toggleDuePaid}
              onUpdateCard={updateCardBill}
            />
          ))}
        </div>

        <div className="reminder-forms">
          <CardBillForm onAdd={addCardBill} />
          <ReminderForm onAdd={addReminder} />
        </div>
      </section>

      <section className="planning-section">
        <div className="section-heading">
          <div>
            <h2>Metas financeiras</h2>
            <p>Acompanhe reserva, viagem, quitar divida ou qualquer objetivo.</p>
          </div>
        </div>
        <div className="goal-grid">
          {goals.map((goal) => (
            <article className="goal-card" key={goal.id}>
              <div>
                <strong>{goal.title}</strong>
                <span>
                  {currency(goal.current)} de {currency(goal.target)}
                </span>
              </div>
              <progress value={Math.min(goal.current, goal.target)} max={goal.target || 1} />
            </article>
          ))}
        </div>
        <GoalForm onAdd={addGoal} />
      </section>

      <section className="planning-section">
        <div className="section-heading">
          <div>
            <h2>Dividas e emprestimos</h2>
            <p>Controle dinheiro emprestado, contas a receber e contas que voce deve pagar.</p>
          </div>
        </div>
        <div className="debt-list">
          {debts.map((debt) => (
            <article className={debt.status === 'Pago' ? 'debt-card paid' : 'debt-card'} key={debt.id}>
              <div>
                <strong>{debt.title}</strong>
                <span>
                  {debt.type} - {debt.person} - vence {formatDate(debt.dueDate)}
                </span>
              </div>
              <div>
                <strong>{currency(debt.amount)}</strong>
                <button type="button" onClick={() => toggleDebtPaid(debt.id)}>
                  {debt.status === 'Pago' ? 'Reabrir' : 'Marcar pago'}
                </button>
              </div>
            </article>
          ))}
        </div>
        <DebtForm onAdd={addDebt} />
      </section>

      <div className="budget-cards">
        {budgetRows.map((item) => (
          <article className="budget-card" key={item.category}>
            <div className="budget-title">
              <strong>{item.category}</strong>
              <button type="button">Editar</button>
            </div>
            <progress value={Math.min(item.spent, item.limit)} max={item.limit} />
            <div className="budget-meta">
              <span>Gasto: {currency(item.spent)}</span>
              <span>Orcado: {currency(item.limit)}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function DueItemCard({ item, onRemoveCard, onTogglePaid, onUpdateCard }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: item.name || '',
    dueDay: item.dueDay || 1,
    closingDay: item.closingDay || 1,
    amount: item.amount || '',
  });

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onUpdateCard(item.id, draft);
    setIsEditing(false);
  }

  if (item.kind === 'Cartao' && isEditing) {
    return (
      <form className={item.paid ? 'due-card paid' : 'due-card'} onSubmit={handleSubmit}>
        <div className="due-card-top">
          <span>Cartao</span>
          <strong>Editando</strong>
        </div>
        <label>
          Nome
          <input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} />
        </label>
        <div className="mini-form-grid">
          <label>
            Vence dia
            <input
              max="31"
              min="1"
              type="number"
              value={draft.dueDay}
              onChange={(event) => updateDraft('dueDay', event.target.value)}
            />
          </label>
          <label>
            Fecha dia
            <input
              max="31"
              min="1"
              type="number"
              value={draft.closingDay}
              onChange={(event) => updateDraft('closingDay', event.target.value)}
            />
          </label>
        </div>
        <label>
          Valor previsto
          <input
            inputMode="decimal"
            value={draft.amount}
            onChange={(event) => updateDraft('amount', event.target.value)}
          />
        </label>
        <div className="card-actions">
          <button type="submit">Salvar</button>
          <button type="button" onClick={() => setIsEditing(false)}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className={item.paid ? 'due-card paid' : 'due-card'}>
      <div className="due-card-top">
        <span>{item.kind}</span>
        <strong>{item.status}</strong>
      </div>
      <h3>{item.title}</h3>
      <p>Vence em {formatDate(item.dueDate)}</p>
      {item.closingDay && <small>Fecha dia {item.closingDay}</small>}
      {item.amount > 0 && <small>Valor previsto: {currency(item.amount)}</small>}
      <div className="card-actions">
        <button type="button" onClick={() => onTogglePaid(item)}>
          {item.paid ? 'Marcar pendente' : 'Marcar pago'}
        </button>
        {item.kind === 'Cartao' && (
          <>
            <button type="button" onClick={() => setIsEditing(true)}>
              Editar vencimento
            </button>
            <button type="button" onClick={() => onRemoveCard(item.id)}>
              Remover
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function CardBillForm({ onAdd }) {
  const [draft, setDraft] = useState({ name: '', dueDay: 8, closingDay: 1, amount: '' });

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onAdd(draft);
    setDraft({ name: '', dueDay: 8, closingDay: 1, amount: '' });
  }

  return (
    <form className="mini-form" onSubmit={handleSubmit}>
      <h3>Novo cartao</h3>
      <label>
        Nome do cartao
        <input
          placeholder="Ex: Nubank"
          required
          value={draft.name}
          onChange={(event) => updateDraft('name', event.target.value)}
        />
      </label>
      <div className="mini-form-grid">
        <label>
          Vence dia
          <input
            max="31"
            min="1"
            required
            type="number"
            value={draft.dueDay}
            onChange={(event) => updateDraft('dueDay', event.target.value)}
          />
        </label>
        <label>
          Fecha dia
          <input
            max="31"
            min="1"
            type="number"
            value={draft.closingDay}
            onChange={(event) => updateDraft('closingDay', event.target.value)}
          />
        </label>
      </div>
      <label>
        Valor previsto
        <input
          inputMode="decimal"
          placeholder="Opcional"
          value={draft.amount}
          onChange={(event) => updateDraft('amount', event.target.value)}
        />
      </label>
      <button type="submit">Adicionar cartao</button>
    </form>
  );
}

function ReminderForm({ onAdd }) {
  const [draft, setDraft] = useState({ title: '', dueDay: 20, amount: '', recurrence: 'Mensal' });

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onAdd(draft);
    setDraft({ title: '', dueDay: 20, amount: '', recurrence: 'Mensal' });
  }

  return (
    <form className="mini-form" onSubmit={handleSubmit}>
      <h3>Novo lembrete</h3>
      <label>
        Conta ou compromisso
        <input
          placeholder="Ex: Pagar MEI"
          required
          value={draft.title}
          onChange={(event) => updateDraft('title', event.target.value)}
        />
      </label>
      <div className="mini-form-grid">
        <label>
          Vence dia
          <input
            max="31"
            min="1"
            required
            type="number"
            value={draft.dueDay}
            onChange={(event) => updateDraft('dueDay', event.target.value)}
          />
        </label>
        <label>
          Repeticao
          <select value={draft.recurrence} onChange={(event) => updateDraft('recurrence', event.target.value)}>
            <option>Mensal</option>
            <option>Unica</option>
            <option>Anual</option>
          </select>
        </label>
      </div>
      <label>
        Valor previsto
        <input
          inputMode="decimal"
          placeholder="Opcional"
          value={draft.amount}
          onChange={(event) => updateDraft('amount', event.target.value)}
        />
      </label>
      <button type="submit">Adicionar lembrete</button>
    </form>
  );
}

function GoalForm({ onAdd }) {
  const [draft, setDraft] = useState({ title: '', target: '', current: '' });

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onAdd(draft);
    setDraft({ title: '', target: '', current: '' });
  }

  return (
    <form className="mini-form inline-form" onSubmit={handleSubmit}>
      <h3>Nova meta</h3>
      <input
        placeholder="Ex: Reserva de emergencia"
        required
        value={draft.title}
        onChange={(event) => updateDraft('title', event.target.value)}
      />
      <input
        inputMode="decimal"
        placeholder="Valor alvo"
        required
        value={draft.target}
        onChange={(event) => updateDraft('target', event.target.value)}
      />
      <input
        inputMode="decimal"
        placeholder="Valor atual"
        value={draft.current}
        onChange={(event) => updateDraft('current', event.target.value)}
      />
      <button type="submit">Adicionar meta</button>
    </form>
  );
}

function DebtForm({ onAdd }) {
  const [draft, setDraft] = useState({
    title: '',
    person: '',
    amount: '',
    dueDate: today(),
    type: 'A receber',
  });

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onAdd(draft);
    setDraft({ title: '', person: '', amount: '', dueDate: today(), type: 'A receber' });
  }

  return (
    <form className="mini-form inline-form" onSubmit={handleSubmit}>
      <h3>Nova divida</h3>
      <input
        placeholder="Ex: Emprestimo"
        required
        value={draft.title}
        onChange={(event) => updateDraft('title', event.target.value)}
      />
      <input
        placeholder="Pessoa"
        required
        value={draft.person}
        onChange={(event) => updateDraft('person', event.target.value)}
      />
      <input
        inputMode="decimal"
        placeholder="Valor"
        required
        value={draft.amount}
        onChange={(event) => updateDraft('amount', event.target.value)}
      />
      <input type="date" value={draft.dueDate} onChange={(event) => updateDraft('dueDate', event.target.value)} />
      <select value={draft.type} onChange={(event) => updateDraft('type', event.target.value)}>
        <option>A receber</option>
        <option>A pagar</option>
      </select>
      <button type="submit">Adicionar</button>
    </form>
  );
}

function Reports({ report, selectedMonth, transactions }) {
  const byCategory = transactions
    .filter((item) => item.amount < 0)
    .reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Math.abs(item.amount);
      return acc;
    }, {});
  const topCategories = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Relatorios</h1>
          <p>Comparativo do mes {selectedMonth} com o mes anterior.</p>
        </div>
      </div>

      <div className="summary-grid">
        <MetricCard label="Receitas vs. mes anterior" value={report.incomeDiff} tone={report.incomeDiff >= 0 ? 'green' : 'red'} icon="IN" />
        <MetricCard label="Despesas vs. mes anterior" value={report.expensesDiff} tone={report.expensesDiff <= 0 ? 'green' : 'red'} icon="OUT" />
        <MetricCard label="Balanco vs. mes anterior" value={report.balanceDiff} tone={report.balanceDiff >= 0 ? 'green' : 'red'} icon="BAL" />
        <MetricCard label="Saldo do mes" value={report.current.balance} tone={report.current.balance >= 0 ? 'green' : 'red'} icon="TOT" />
      </div>

      <section className="panel large-panel">
        <h2>Maiores categorias de despesa</h2>
        <div className="report-list">
          {topCategories.map((item) => (
            <article key={item.category}>
              <span>{item.category}</span>
              <strong>{currency(item.amount)}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function BudgetList({ budgetRows }) {
  return (
    <div className="mini-budget-list">
      {budgetRows.slice(0, 4).map((item) => (
        <div className="mini-budget" key={item.category}>
          <div>
            <span>{item.category}</span>
            <strong>{currency(item.spent)}</strong>
          </div>
          <progress value={Math.min(item.spent, item.limit)} max={item.limit} />
        </div>
      ))}
    </div>
  );
}

function getBudgetRows(expensesByCategory) {
  return budgets.map((budget) => {
    const spent = expensesByCategory.find((item) => item.name === budget.category)?.value || 0;
    return { ...budget, spent };
  });
}

function Settings({ config, exportBackup, exportTransactionsCsv, importBackup, onSave, syncStatus }) {
  const [draft, setDraft] = useState(config);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(draft);
  }

  function handleBackupFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        importBackup(JSON.parse(reader.result));
      } catch {
        alert('Nao foi possivel importar esse backup.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Configuracoes</h1>
        </div>
      </div>

      <form className="settings-card" onSubmit={handleSubmit}>
        <div className="settings-heading">
          <div className="settings-icon">GS</div>
          <div>
            <strong>Integracao com Google Sheets</strong>
            <p>Sincronize seus lancamentos automaticamente.</p>
          </div>
        </div>

        <label>
          Chave da API do Google
          <input
            type="password"
            placeholder="Cole sua API key"
            value={draft.apiKey}
            onChange={(event) => updateDraft('apiKey', event.target.value)}
          />
        </label>

        <label>
          URL ou ID da planilha Google Sheets
          <div className="url-row">
            <input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={draft.sheetId}
              onChange={(event) => updateDraft('sheetId', event.target.value)}
            />
          </div>
        </label>

        <label>
          Intervalo da aba
          <input
            placeholder="Lancamentos!A:J"
            value={draft.range}
            onChange={(event) => updateDraft('range', event.target.value)}
          />
        </label>

        <label>
          URL do Google Apps Script para gravar na planilha
          <input
            placeholder="https://script.google.com/macros/s/..."
            value={draft.scriptUrl}
            onChange={(event) => updateDraft('scriptUrl', event.target.value)}
          />
        </label>

        <button className="save-button" type="submit">
          Salvar e sincronizar
        </button>

        <div className="info-box">
          <strong>Como ativar a sincronizacao?</strong>
          <p>
            A chave da API le a planilha. Para gravar novos lancamentos nela, cole tambem a URL do Web App criado no
            Google Apps Script.
          </p>
          <small>Status atual: {syncStatus}</small>
        </div>
      </form>

      <section className="settings-card">
        <div className="settings-heading">
          <div className="settings-icon">BK</div>
          <div>
            <strong>Backup, importacao e exportacao</strong>
            <p>Guarde uma copia dos seus dados ou gere CSV para abrir no Google Sheets/Excel.</p>
          </div>
        </div>

        <div className="backup-actions">
          <button type="button" onClick={exportTransactionsCsv}>
            Exportar CSV
          </button>
          <button type="button" onClick={exportBackup}>
            Baixar backup
          </button>
          <label className="import-button">
            Restaurar backup
            <input accept="application/json" type="file" onChange={handleBackupFile} />
          </label>
        </div>

        <div className="info-box">
          <strong>Sincronizacao completa com Google Sheets</strong>
          <p>
            A leitura usa a Google Sheets API. A gravacao usa um Web App do Google Apps Script para adicionar linhas na
            aba `Lancamentos`.
          </p>
        </div>
      </section>
    </div>
  );
}

function Help() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>? Ajuda</h1>
          <p>Formato esperado da aba Lancamentos</p>
        </div>
      </div>
      <section className="settings-card compact">
        <p>
          A planilha deve ter as colunas Data, Descricao, Categoria, Conta e Valor. Valores positivos entram como
          receita; valores negativos entram como despesa.
        </p>
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
