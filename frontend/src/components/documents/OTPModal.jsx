import { useEffect, useRef, useState, useCallback } from 'react';
import { HiOutlineXMark, HiOutlineCheckCircle } from 'react-icons/hi2';
import api from '../../lib/api';

const OTP_TTL_SEC = 5 * 60;
const RESEND_AFTER_SEC = 60;

export default function OTPModal({ isOpen, onClose, documentId, role, onVerified }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [remaining, setRemaining] = useState(OTP_TTL_SEC);
  const [resendIn, setResendIn] = useState(RESEND_AFTER_SEC);
  const inputsRef = useRef([]);

  const sendOtp = useCallback(async () => {
    if (!documentId || !role) return;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post('/documents/send-otp', { documentId, role });
      setMaskedPhone(data.maskedPhone || '');
      setRemaining(OTP_TTL_SEC);
      setResendIn(RESEND_AFTER_SEC);
    } catch (e) {
      setError(e.message || 'Could not send OTP');
    } finally {
      setSending(false);
    }
  }, [documentId, role]);

  useEffect(() => {
    if (!isOpen) return;
    setDigits(['', '', '', '', '', '']);
    setError('');
    setSuccess(false);
    setMaskedPhone('');
    sendOtp();
    const t = setTimeout(() => inputsRef.current[0]?.focus(), 150);
    return () => clearTimeout(t);
  }, [isOpen, documentId, role, sendOtp]);

  useEffect(() => {
    if (!isOpen || success) return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
      setResendIn((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isOpen, success]);

  const handleDigit = (index, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    if (v && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length) {
      const arr = text.split('').concat(['', '', '', '', '', '']).slice(0, 6);
      setDigits(arr);
      inputsRef.current[Math.min(text.length, 5)]?.focus();
      e.preventDefault();
    }
  };

  const submit = async () => {
    const otp = digits.join('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const { data } = await api.post('/documents/verify-otp', { documentId, role, otp });
      setSuccess(true);
      onVerified?.(data.document);
    } catch (e) {
      setError(e.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:bg-gray-100"
          aria-label="Close"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>

        {!success ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 pr-10">Confirm with OTP</h3>
            <p className="text-sm text-gray-500 mt-1">
              Code sent to <span className="font-medium text-gray-700">{maskedPhone || 'your phone'}</span>
            </p>

            <div className="mt-6 flex justify-center gap-2" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-10 h-12 text-center text-lg font-semibold border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              ))}
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              Time left: <span className="font-mono font-semibold text-gray-900">{mm}:{ss}</span>
            </div>

            {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={verifying || remaining === 0}
                onClick={submit}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {verifying ? 'Verifying…' : 'Verify OTP'}
              </button>
              <button
                type="button"
                disabled={sending || resendIn > 0}
                onClick={sendOtp}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {sending ? 'Sending…' : resendIn > 0 ? `Resend OTP (${resendIn}s)` : 'Resend OTP'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <HiOutlineCheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900">Document confirmed successfully</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
