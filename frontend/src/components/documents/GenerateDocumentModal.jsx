import { useEffect, useState } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useSearchBuyers, useGenerateDocument } from '../../hooks/useDocuments';

function GenerateDocumentModalContent({ property, onClose }) {
  const [docType, setDocType] = useState(
    property.status === 'FOR_RENT' ? 'RENT_AGREEMENT' : 'SALE_DEED'
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState(null);

  const search = useSearchBuyers();
  const generate = useGenerateDocument();

  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => {
      search.mutate(query.trim(), {
        onSuccess: (buyers) => setResults(buyers || []),
        onError: () => setResults([]),
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const visibleResults = query.trim().length >= 2 ? results : [];

  const handleQueryChange = (value) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
    }
  };

  const handleGenerate = () => {
    if (!selectedBuyer) {
      toast.error('Select a buyer or tenant');
      return;
    }
    generate.mutate(
      { propertyId: property.id, type: docType, buyerId: selectedBuyer.id },
      {
        onSuccess: (data) => {
          toast.success('Document created. Please sign as seller first.');
          onClose?.(data);
        },
        onError: (e) => toast.error(e.message || 'Could not generate'),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={() => onClose?.()}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:bg-gray-100"
          aria-label="Close"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 pr-10">Generate document</h3>
        <p className="text-sm text-gray-500 mt-1">{property.title}</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Document type</label>
            <div className="flex gap-3">
              <label className={`flex-1 border rounded-xl px-3 py-2 cursor-pointer text-sm ${docType === 'SALE_DEED' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  className="sr-only"
                  name="dtype"
                  checked={docType === 'SALE_DEED'}
                  onChange={() => setDocType('SALE_DEED')}
                  disabled={property.status !== 'FOR_SALE'}
                />
                Sale Deed
              </label>
              <label className={`flex-1 border rounded-xl px-3 py-2 cursor-pointer text-sm ${docType === 'RENT_AGREEMENT' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  className="sr-only"
                  name="dtype"
                  checked={docType === 'RENT_AGREEMENT'}
                  onChange={() => setDocType('RENT_AGREEMENT')}
                  disabled={property.status !== 'FOR_RENT'}
                />
                Rent Agreement
              </label>
            </div>
            {property.status === 'FOR_SALE' && (
              <p className="text-xs text-gray-400 mt-1">Rent agreement is only available for For Rent listings.</p>
            )}
            {property.status === 'FOR_RENT' && (
              <p className="text-xs text-gray-400 mt-1">Sale deed is only available for For Sale listings.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Find buyer / tenant (name or email)
            </label>
            <input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Type at least 2 characters…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {selectedBuyer && (
              <p className="mt-2 text-sm text-emerald-700 font-medium">
                Selected: {selectedBuyer.name} ({selectedBuyer.email})
              </p>
            )}
            {visibleResults.length > 0 && (
              <ul className="mt-2 border border-gray-100 rounded-xl divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {visibleResults.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => {
                        setSelectedBuyer(b);
                        setResults([]);
                        setQuery(b.email);
                      }}
                    >
                      <span className="font-medium text-gray-900">{b.name}</span>
                      <span className="text-gray-500"> · {b.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => onClose?.()}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={generate.isPending}
            onClick={handleGenerate}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {generate.isPending ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GenerateDocumentModal({ property, isOpen, onClose }) {
  if (!isOpen || !property) return null;
  return (
    <GenerateDocumentModalContent
      key={`${property.id}-${property.status}`}
      property={property}
      onClose={onClose}
    />
  );
}
