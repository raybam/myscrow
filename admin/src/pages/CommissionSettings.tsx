import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Percent, DollarSign, Save, RefreshCw, Info } from 'lucide-react';
import api from '../services/api';

type CommissionType = 'percentage' | 'flat';

interface CommissionData {
    type: CommissionType;
    value: number;
}

const SAMPLE_AMOUNT = 100_000; // ₦100,000 sample escrow

const CommissionSettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [type, setType] = useState<CommissionType>('percentage');
    const [value, setValue] = useState<string>('5');
    const [original, setOriginal] = useState<CommissionData | null>(null);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data } = await api.get<CommissionData>('/admin/settings/commission');
            setType(data.type);
            setValue(String(data.value));
            setOriginal({ type: data.type, value: data.value });
        } catch (err: any) {
            toast.error('Could not load commission settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const computedFee = (): number => {
        const num = parseFloat(value) || 0;
        if (type === 'flat') return num;
        return (SAMPLE_AMOUNT * num) / 100;
    };

    // Compare current state against what was last saved
    const hasChanges = original !== null && (
        original.type !== type || original.value !== parseFloat(value || '0')
    );

    const handleSave = async () => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
            toast.error('Please enter a valid non-negative number');
            return;
        }
        if (type === 'percentage' && num > 100) {
            toast.error('Percentage cannot exceed 100%');
            return;
        }
        setSaving(true);
        try {
            await api.patch('/admin/settings/commission', { type, value: num });
            setOriginal({ type, value: num });
            toast.success('Commission settings saved successfully');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save commission settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Commission Settings</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Set the platform fee applied when a new escrow is funded.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Mode Toggle */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Commission Mode
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setType('percentage')}
                                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${type === 'percentage'
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <Percent className="h-4 w-4" />
                                    Percentage (%)
                                </button>
                                <button
                                    onClick={() => setType('flat')}
                                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${type === 'flat'
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    <DollarSign className="h-4 w-4" />
                                    Flat Amount (₦)
                                </button>
                            </div>
                        </div>

                        {/* Value Input */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {type === 'percentage' ? 'Commission Percentage' : 'Flat Commission Amount'}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    {type === 'percentage' ? (
                                        <Percent className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <span className="text-gray-400 font-medium text-sm">₦</span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max={type === 'percentage' ? 100 : undefined}
                                    step={type === 'percentage' ? '0.1' : '1'}
                                    value={value}
                                    onChange={e => setValue(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder={type === 'percentage' ? 'e.g. 2.5' : 'e.g. 500'}
                                />
                                {type === 'percentage' && (
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                        <span className="text-gray-400 text-sm">/ 100</span>
                                    </div>
                                )}
                            </div>
                            <p className="mt-1.5 text-xs text-gray-400">
                                {type === 'percentage'
                                    ? 'Enter a value between 0 and 100.'
                                    : 'Enter the fixed fee in Naira (₦).'}
                            </p>
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
                        <div className="flex items-start gap-2 mb-4">
                            <Info className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-semibold text-indigo-700">Live Fee Preview</span>
                        </div>
                        <p className="text-xs text-indigo-600 mb-4">
                            Based on a sample escrow of{' '}
                            <span className="font-semibold">₦{SAMPLE_AMOUNT.toLocaleString()}</span>
                        </p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Escrow Amount</span>
                                <span className="font-medium text-gray-900">₦{SAMPLE_AMOUNT.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                    Platform Fee{' '}
                                    {type === 'percentage'
                                        ? `(${parseFloat(value) || 0}%)`
                                        : '(flat)'}
                                </span>
                                <span className="font-medium text-indigo-700">
                                    + ₦{computedFee().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="border-t border-indigo-200 pt-2 flex justify-between text-sm font-semibold">
                                <span className="text-gray-700">Buyer Pays Total</span>
                                <span className="text-gray-900">
                                    ₦{(SAMPLE_AMOUNT + computedFee()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={fetchSettings}
                            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Reload
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${saving || !hasChanges
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                                }`}
                        >
                            {saving ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CommissionSettings;
