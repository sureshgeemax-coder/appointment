import { format } from 'date-fns';
import { formatDisplayDate } from './appointment';

const rowsFor = (appointments) => appointments.map((item) => ({
  Date: formatDisplayDate(item.date), Start: item.startTime, End: item.endTime, Title: item.title,
  'Meeting with': item.meetingWith || '', Company: item.company || '', Type: item.type || '',
  Priority: item.priority || '', Status: item.status || '', Location: item.location || '',
}));

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(appointments) {
  const rows = rowsFor(appointments);
  const headers = Object.keys(rows[0] || { Date: '', Title: '' });
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `appointments-${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

export async function exportXlsx({ from, to, type }, token) {
  const query = new URLSearchParams({ from, to, ...(type !== 'all' ? { type } : {}) });
  const response = await fetch(`/api/reports/excel?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Excel report could not be generated.');
  download(await response.blob(), `appointments-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export async function exportPdf(appointments) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text('Suresh Appointment App', 14, 18);
  doc.setFontSize(10);
  doc.text(`Appointment report generated ${format(new Date(), 'PPpp')}`, 14, 26);
  let y = 38;
  appointments.forEach((item, index) => {
    if (y > 275) { doc.addPage(); y = 18; }
    doc.setFont(undefined, 'bold');
    doc.text(`${index + 1}. ${item.title}`, 14, y);
    doc.setFont(undefined, 'normal');
    doc.text(`${formatDisplayDate(item.date)}  ${item.startTime}-${item.endTime}  |  ${item.type || 'Other'}  |  ${item.status || 'Scheduled'}`, 18, y + 6);
    y += 16;
  });
  doc.save(`appointments-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
