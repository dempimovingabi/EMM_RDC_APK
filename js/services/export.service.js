// js/services/export.service.js
// Exports CSV (Frequence_EMM_RDC.csv), Word (.doc) et Excel (.xls) UTF-8 BOM — EMM RD CONGO

function escapeCsvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  const sanitized = str.replace(/"/g, '""');
  return `"${sanitized}"`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Exporte le tableau des fréquences de culte au format officiel :
 * Frequence_EMM_RDC.csv (UTF-8 BOM, séparateur ';', 8 colonnes + sous-totaux par province)
 */
export function exporterCSV(provincesData = [], filename = 'Frequence_EMM_RDC.csv') {
  const headers = [
    'PROVINCE',
    "TYPE D'ENTITÉ",
    'DÉNOMINATION',
    'MB',
    'SY',
    'NV',
    'TOTAL',
    'OBSERVATIONS'
  ];

  const rows = [headers.map(escapeCsvCell).join(';')];

  for (const bloc of provincesData) {
    const provName = bloc.province || '';
    const entites = Array.isArray(bloc.entites) ? bloc.entites : [];

    let subMb = 0;
    let subSy = 0;
    let subNv = 0;
    let subTotal = 0;

    for (const ent of entites) {
      const mb = Number(ent.mb) || 0;
      const sy = Number(ent.sy) || 0;
      const nv = Number(ent.nv) || 0;
      const total = mb + sy + nv;

      subMb += mb;
      subSy += sy;
      subNv += nv;
      subTotal += total;

      rows.push(
        [
          provName,
          ent.type || '',
          ent.nom || '',
          mb,
          sy,
          nv,
          total,
          ent.obs || ''
        ]
          .map(escapeCsvCell)
          .join(';')
      );
    }

    rows.push(
      [
        provName,
        'SOUS-TOTAL',
        `TOTAL ${provName}`,
        subMb,
        subSy,
        subNv,
        subTotal,
        ''
      ]
        .map(escapeCsvCell)
        .join(';')
    );
  }

  const csvContent = `\uFEFF${rows.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Exporte une zone HTML vers Microsoft Word (.doc) encodé UTF-8 avec BOM
 */
export function exportHtmlToWord(htmlContent, filename = 'rapport_emm_rdc.doc') {
  const docHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8" /><title>${filename}</title></head>
    <body>${htmlContent}</body>
    </html>
  `;
  const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
  triggerDownload(blob, filename);
}

/**
 * Exporte une zone HTML vers Microsoft Excel (.xls) encodé UTF-8 avec BOM
 */
export function exportHtmlToExcel(htmlContent, filename = 'rapport_emm_rdc.xls') {
  const xlsHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8" /><title>${filename}</title></head>
    <body>${htmlContent}</body>
    </html>
  `;
  const blob = new Blob(['\ufeff', xlsHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  triggerDownload(blob, filename);
}
