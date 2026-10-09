const SHEET_NAME = 'Lancamentos';
const LOAN_SHEET_NAME = 'Emprestimos';
const LOAN_HEADER = ['ID', 'Data', 'Descricao', 'Credor', 'Valor total', 'Parcelas', 'Valor parcela', 'Primeira parcela', 'Parcelas pagas', 'Falta pagar', 'Meses pagos', 'Observacao'];
// Texto puro nas colunas de ID, data, mes e meses pagos, para o Sheets nao converter.
const LOAN_FORMATS = ['@', '@', '@', '@', '#,##0.00', '0', '#,##0.00', '@', '0', '#,##0.00', '@', '@'];

function respond(data, callback) {
  const output = JSON.stringify(data);

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${output})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function getLoanSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(LOAN_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(LOAN_SHEET_NAME);
    sheet.getRange(1, 1, 1, LOAN_HEADER.length).setValues([LOAN_HEADER]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;

  if (action === 'listTransactions') {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const values = sheet.getDataRange().getValues().map((row, rowIndex) =>
      row.map((cell, columnIndex) => {
        if (rowIndex > 0 && columnIndex === 0 && cell instanceof Date) {
          return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }

        return cell;
      })
    );

    return respond({ values }, callback);
  }

  if (action === 'listEmprestimos') {
    const values = getLoanSheet().getDataRange().getValues().map((row, rowIndex) =>
      row.map((cell) => {
        if (rowIndex > 0 && cell instanceof Date) {
          return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }

        return cell;
      })
    );

    return respond({ values }, callback);
  }

  return ContentService.createTextOutput('ignored');
}

function findLoanRow(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().map((row) => row[0]);
  const index = ids.indexOf(String(id));
  return index >= 0 ? index + 2 : -1;
}

function saveLoan(row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getLoanSheet();
    const values = LOAN_HEADER.map((_, index) => (row[index] === undefined || row[index] === null ? '' : row[index]));
    const existing = findLoanRow(sheet, values[0]);
    const target = existing > 0 ? existing : sheet.getLastRow() + 1;
    const range = sheet.getRange(target, 1, 1, LOAN_HEADER.length);

    range.setNumberFormats([LOAN_FORMATS]);
    range.setValues([values.map((value, index) => (LOAN_FORMATS[index] === '@' ? String(value) : value))]);
  } finally {
    lock.releaseLock();
  }
}

function deleteLoan(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getLoanSheet();
    const row = findLoanRow(sheet, id);
    if (row > 0) sheet.deleteRow(row);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const payloadText = e.parameter.payload || e.postData.contents || '{}';
  const payload = JSON.parse(payloadText);

  if (payload.action === 'saveEmprestimo') {
    saveLoan(payload.row || []);
    return ContentService.createTextOutput('saved');
  }

  if (payload.action === 'deleteEmprestimo') {
    deleteLoan(String(payload.id || ''));
    return ContentService.createTextOutput('deleted');
  }

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
