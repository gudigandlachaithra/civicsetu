import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Landmark, Phone, KeyRound, ArrowRight, Info } from 'lucide-react';

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError(t('login.invalidPhone'));
      return;
    }
    setError(null);
    setStep('otp');
  };

  const handleVerify = async () => {
    if (otp !== '123456') {
      setError(t('login.invalidOtp'));
      return;
    }
    setError(null);
    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, '');
    const { error: signInError } = await signIn(cleanPhone);
    if (signInError) {
      setError(t('login.loginFailed'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A3D91] via-[#1B5BBF] to-[#062A66] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden slide-up">
        {/* Header with flag colors */}
        <div className="bg-gradient-to-r from-[#FF9933] via-white to-[#138808] p-1">
          <div className="bg-white/90 backdrop-blur rounded-t-2xl px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0A3D91] rounded-2xl mb-3">
              <Landmark className="w-8 h-8 text-[#FF9933]" />
            </div>
            <h1 className="text-2xl font-bold text-[#0A3D91]">{t('login.title')}</h1>
            <p className="text-gray-600 text-sm mt-2">{t('login.subtitle')}</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {step === 'phone' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('login.phoneLabel')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    placeholder={t('login.phonePlaceholder')}
                    className="input-field pl-12 text-lg tracking-wider"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm font-medium">{error}</p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={phone.length !== 10}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {t('login.sendOtp')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('login.otpLabel')}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    placeholder={t('login.otpPlaceholder')}
                    className="input-field pl-12 text-lg tracking-[0.3em] text-center"
                    autoFocus
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-[#FF9933] bg-[#FF9933]/10 rounded-lg px-3 py-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>{t('login.otpHint')}</span>
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm font-medium">{error}</p>
              )}

              <button
                onClick={handleVerify}
                disabled={otp.length !== 6 || loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? t('common.loading') : t('login.verifyOtp')}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>

              <button
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError(null);
                }}
                className="w-full text-center text-sm text-gray-500 hover:text-[#0A3D91] font-medium"
              >
                {t('common.back')}
              </button>
            </>
          )}

          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">{t('login.officialLoginHint')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
