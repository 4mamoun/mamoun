import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-blue-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-sm text-gray-400 max-w-md mb-6">
        {description || 'هذه الشاشة قيد التطوير وستكون متاحة في المرحلة القادمة'}
      </p>
      <button
        onClick={() => navigate('/dash')}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        العودة للوحة القيادة
      </button>
    </div>
  );
}
