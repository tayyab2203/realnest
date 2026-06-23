import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DocumentViewer from '../components/documents/DocumentViewer';

export default function DocumentSignPage() {
  const { documentId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const continueRaw = searchParams.get('continue') || '';
  const continueTo = continueRaw.startsWith('/payment/') ? continueRaw : '';

  if (!user && !loading) return <Navigate to="/login" replace />;

  if (!documentId) return <Navigate to="/" replace />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex flex-wrap gap-2 text-xs font-medium text-gray-500 mb-4">
        <span className="px-2 py-1">1. Property</span>
        <span className="px-2 py-1">2. Payment plan</span>
        <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded-full">3. Agreement</span>
        <span className="px-2 py-1">4. Payment</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Review digital agreement</h1>
      <DocumentViewer documentId={documentId} continueTo={continueTo} />
    </div>
  );
}
