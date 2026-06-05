import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BatchNotes from '@/components/BatchNotes';
import { useState, useEffect } from 'react';
import { useDataStore } from '@/store/dataStore';

export default function BatchNotesPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { batches } = useDataStore();
  const [open, setOpen] = useState(true);

  const batch = batches.find(b => b.id === batchId);

  useEffect(() => {
    if (!open) {
      navigate(-1);
    }
  }, [open, navigate]);

  if (!batchId) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">معرف الدفعة غير موجود</p>
        <Button className="mt-4" onClick={() => navigate('/batches')}>
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة للدفعات
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mb-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowRight className="w-4 h-4 ml-2" />
          رجوع
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow">
        <BatchNotes
          batchId={batchId}
          batchName={batch?.name || batchId}
          open={open}
          onClose={() => setOpen(false)}
        />
      </div>
    </div>
  );
}
