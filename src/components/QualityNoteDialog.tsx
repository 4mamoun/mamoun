import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Send, XCircle, MessageSquare } from 'lucide-react';

interface QualityNoteDialogProps {
  open: boolean;
  onClose: () => void;
  itemType: 'part' | 'top' | 'accessory' | 'product' | 'shipment';
  itemName: string;
  itemCode: string;
}

export default function QualityNoteDialog({ open, onClose, itemType, itemName, itemCode }: QualityNoteDialogProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [noteType, setNoteType] = useState<'reject' | 'note'>('note');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState('');
  const [sent, setSent] = useState(false);

  const typeLabels: Record<string, { ar: string; en: string }> = {
    part: { ar: 'قطعة', en: 'Part' },
    top: { ar: 'توب', en: 'Top' },
    accessory: { ar: 'اكسسوار', en: 'Accessory' },
    product: { ar: 'منتج', en: 'Product' },
    shipment: { ar: 'شحنة', en: 'Shipment' },
  };

  const label = typeLabels[itemType] || typeLabels.part;

  const handleSend = () => {
    // TODO: Save to Firestore (Cloud only — no localStorage)
    console.log('[QualityNote]', { itemType, itemName, itemCode, noteType, reason, notes, qty });
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setReason('');
      setNotes('');
      setQty('');
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto pb-8" dir={isAr ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {isAr ? 'إرسال إلى الجودة' : 'Send to Quality'}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-bold text-green-700">{isAr ? 'تم الإرسال بنجاح!' : 'Sent successfully!'}</p>
            <p className="text-xs text-gray-400 mt-1">{isAr ? 'تم إرسال التقرير إلى قسم الجودة' : 'Report sent to quality department'}</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Item info */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-[10px] text-gray-400">{isAr ? label.ar : label.en}</p>
              <p className="text-sm font-bold text-gray-800">{itemName}</p>
              <p className="text-xs font-mono text-gray-500">{itemCode}</p>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setNoteType('note')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  noteType === 'note'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {isAr ? 'ملاحظة' : 'Note'}
              </button>
              <button
                onClick={() => setNoteType('reject')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  noteType === 'reject'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                {isAr ? 'رفض' : 'Reject'}
              </button>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                {isAr ? 'الكمية' : 'Quantity'}
              </label>
              <Input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="1"
                className="text-sm"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                {noteType === 'reject' ? (isAr ? 'سبب الرفض *' : 'Rejection Reason *') : (isAr ? 'السبب' : 'Reason')}
              </label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={isAr ? 'مثال: خدوش سطحية' : 'e.g. Surface scratches'}
                className="text-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                {isAr ? 'ملاحظات إضافية' : 'Additional Notes'}
              </label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={isAr ? 'أي تفاصيل إضافية...' : 'Any additional details...'}
                className="text-sm min-h-[80px]"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSend}
              disabled={noteType === 'reject' && !reason.trim()}
              className={`w-full gap-2 ${noteType === 'reject' ? 'bg-red-500 hover:bg-red-600' : ''}`}
            >
              <Send className="w-4 h-4" />
              {isAr ? 'إرسال إلى قسم الجودة' : 'Send to Quality'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
