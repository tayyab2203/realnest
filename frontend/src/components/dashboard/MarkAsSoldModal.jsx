import { useState } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';

const TRANSACTION_TYPES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'INSTALLMENTS', label: 'Installments' },
  { value: 'OTHER', label: 'Other' },
];

const HANDOVER_STATUSES = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PENDING', label: 'Pending' },
];

const emptyForm = {
  saleDate: '',
  salePrice: '',
  transactionType: 'CASH',
  handoverStatus: 'COMPLETED',
  buyerName: '',
  buyerContact: '',
  notes: '',
};

export default function MarkAsSoldModal({ property, onClose, onSubmit, isPending }) {
  const [form, setForm] = useState(emptyForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      propertyId: property.id,
      saleDate: form.saleDate,
      salePrice: parseFloat(form.salePrice),
      transactionType: form.transactionType,
      handoverStatus: form.handoverStatus,
      buyerName: form.buyerName || undefined,
      buyerContact: form.buyerContact || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-sold-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          aria-label="Close"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>

        <h2 id="mark-sold-modal-title" className="pr-10 text-xl font-bold text-gray-900">
          Mark as Sold
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Record an offline sale for &ldquo;{property.title}&rdquo;. This will remove the listing from the marketplace.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="saleDate" className="block text-xs font-medium text-gray-500 mb-1">
              Sale Date <span className="text-red-500">*</span>
            </label>
            <input
              id="saleDate"
              name="saleDate"
              type="date"
              required
              value={form.saleDate}
              onChange={handleChange}
              disabled={isPending}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="salePrice" className="block text-xs font-medium text-gray-500 mb-1">
              Final Sale Price (PKR) <span className="text-red-500">*</span>
            </label>
            <input
              id="salePrice"
              name="salePrice"
              type="number"
              min="1"
              step="1"
              required
              value={form.salePrice}
              onChange={handleChange}
              disabled={isPending}
              placeholder="e.g. 15000000"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="transactionType" className="block text-xs font-medium text-gray-500 mb-1">
              Transaction Type <span className="text-red-500">*</span>
            </label>
            <select
              id="transactionType"
              name="transactionType"
              required
              value={form.transactionType}
              onChange={handleChange}
              disabled={isPending}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            >
              {TRANSACTION_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="handoverStatus" className="block text-xs font-medium text-gray-500 mb-1">
              Property Handover Status <span className="text-red-500">*</span>
            </label>
            <select
              id="handoverStatus"
              name="handoverStatus"
              required
              value={form.handoverStatus}
              onChange={handleChange}
              disabled={isPending}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            >
              {HANDOVER_STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="buyerName" className="block text-xs font-medium text-gray-500 mb-1">
              Buyer Name
            </label>
            <input
              id="buyerName"
              name="buyerName"
              type="text"
              value={form.buyerName}
              onChange={handleChange}
              disabled={isPending}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="buyerContact" className="block text-xs font-medium text-gray-500 mb-1">
              Buyer Contact Number
            </label>
            <input
              id="buyerContact"
              name="buyerContact"
              type="tel"
              value={form.buyerContact}
              onChange={handleChange}
              disabled={isPending}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-gray-500 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={handleChange}
              disabled={isPending}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {isPending ? 'Saving…' : 'Mark Property as Sold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
