const SHEET_NAME = 'Lancamentos';
const FATURA_SHEET_NAME = 'Faturas';
// Limite do Google Sheets e 50.000 caracteres por celula; o JSON e dividido em pedacos.
const FATURA_CHUNK = 45000;

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

function getFaturaSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(FATURA_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(FATURA_SHEET_NAME);
    sheet.getRange(1, 1, 1, 3).setValues([['Chave', 'Atualizado em', 'Dados (JSON)']]);
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

  if (action === 'listFatura') {
    const values = getFaturaSheet().getDataRange().getValues().slice(1);
    const rows = values
      .filter((row) => row[0])
      .map((row) => [String(row[0]), row.slice(2).join('')]);

    return respond({ rows }, callback);
  }

  return ContentService.createTextOutput('ignored');
}

function saveFatura(key, json) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getFaturaSheet();
    const lastRow = sheet.getLastRow();
    const keys = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().map((row) => String(row[0])) : [];
    const index = keys.indexOf(key);
    const row = index >= 0 ? index + 2 : lastRow + 1;

    if (!json) {
      if (index >= 0) sheet.deleteRow(row);
      return;
    }

    const chunks = [];
    for (let start = 0; start < json.length; start += FATURA_CHUNK) {
      chunks.push(json.slice(start, start + FATURA_CHUNK));
    }

    if (index >= 0 && sheet.getLastColumn() > 2) {
      sheet.getRange(row, 3, 1, sheet.getLastColumn() - 2).clearContent();
    }

    sheet.getRange(row, 1, 1, 2).setValues([[key, new Date()]]);
    // Formato texto para o Sheets nao converter pedacos do JSON em numero ou formula.
    sheet.getRange(row, 3, 1, chunks.length).setNumberFormat('@').setValues([chunks]);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const payloadText = e.parameter.payload || e.postData.contents || '{}';
  const payload = JSON.parse(payloadText);

  if (payload.action === 'saveFatura') {
    saveFatura(String(payload.key || ''), String(payload.json || ''));
    return ContentService.createTextOutput('saved');
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
