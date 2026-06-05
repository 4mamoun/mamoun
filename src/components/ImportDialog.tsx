import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertTriangle, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: Record<string, string>[]) => void;
  title: string;
  expectedColumns: string[];
  columnMapping: Record<string, string>;
}

export default function ImportDialog({ open, onClose, onImport, title, expectedColumns, columnMapping }: ImportDialogProps) {
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (json.length < 2) {
          setErrors(['الملف فارغ أو لا يحتوي على بيانات كافية']);
          return;
        }

        const headers = (json[0] as string[]).map(h => String(h).trim());
        const rows: Record<string, string>[] = [];
        const errs: string[] = [];

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (row.every(cell => !cell)) continue;

          const mapped: Record<string, string> = {};
          headers.forEach((header, colIdx) => {
            const key = columnMapping[header] || header;
            if (key) mapped[key] = String(row[colIdx] || '');
          });

          if (Object.keys(mapped).length > 0) rows.push(mapped);
        }

        if (rows.length === 0) errs.push('لم يتم العثور على صفوف صالحة');
        setPreview(rows.slice(0, 10));
        setErrors(errs);
      } catch {
        setErrors(['خطأ في قراءة الملف. تأكد من صيغة Excel أو CSV']);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    if (preview.length === 0) return;
    const reader = new FileReader();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
      const headers = (json[0] as string[]).map(h => String(h).trim());
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (row.every(cell => !cell)) continue;
        const mapped: Record<string, string> = {};
        headers.forEach((header, colIdx) => {
          const key = columnMapping[header] || header;
          if (key) mapped[key] = String(row[colIdx] || '');
        });
        if (Object.keys(mapped).length > 0) rows.push(mapped);
      }
      onImport(rows);
      setPreview([]);
      setFileName('');
      setErrors([]);
      onClose();
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> استيراد {title}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> الأعمدة المتوقعة:</p>
            <p className="text-[10px] text-amber-600 mt-0.5">{expectedColumns.join(' | ')}</p>
          </div>

          <label className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${fileName ? 'border-green-400 bg-green-50/40' : 'border-gray-300 bg-gray-50/40 hover:border-blue-400'}`}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            {fileName ? (
              <><Check className="w-6 h-6 text-green-500" /><p className="text-xs font-bold text-green-700">{fileName}</p><p className="text-[10px] text-green-600">{preview.length} صفوف</p></>
            ) : (
              <><Upload className="w-6 h-6 text-gray-400" /><p className="text-xs text-gray-500">اختر ملف Excel أو CSV</p><p className="text-[10px] text-gray-400">اسحب الملف هنا أو انقر</p></>
            )}
          </label>

          {errors.length > 0 && <div className="bg-red-50 border border-red-200 rounded-lg p-3">{errors.map((e, i) => <p key={i} className="text-[10px] text-red-600 flex items-center gap-1"><X className="w-3 h-3" />{e}</p>)}</div>}

          {preview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <p className="text-[10px] font-bold text-gray-500 p-2 bg-gray-50">معاينة (أول {preview.length} صفوف):</p>
              <div className="overflow-x-auto"><table className="w-full text-[10px]">
                <thead><tr className="bg-gray-50">{Object.keys(preview[0]).map(k => <th key={k} className="p-1.5 text-right font-bold text-gray-600 border-l">{k}</th>)}</tr></thead>
                <tbody>{preview.map((row, i) => <tr key={i} className="border-t">{Object.values(row).map((v, j) => <td key={j} className="p-1.5 text-gray-700 border-l">{String(v)}</td>)}</tr>)}</tbody>
              </table></div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => { setPreview([]); setFileName(''); setErrors([]); onClose(); }}>إلغاء</Button>
            <Button size="sm" onClick={handleImport} disabled={preview.length === 0 || errors.length > 0} className="bg-gradient-to-r from-green-600 to-green-700">
              <Upload className="w-3.5 h-3.5 ml-1" /> استيراد {preview.length > 0 && `(${preview.length}+)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
