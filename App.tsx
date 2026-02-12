import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Users, 
  Download, 
  Trash2, 
  RefreshCw, 
  Eye, 
  MessageCircle, 
  AlertCircle, 
  CheckCircle2,
  Smartphone,
  Copy,
  Check,
  List,
  Files,
  Settings,
  ChevronDown,
  ChevronUp,
  Sliders,
  Eraser,
  Save,
  Send,
  XCircle,
  ArchiveRestore
} from 'lucide-react';
import { GeneratedContact, GenerationConfig, GenerationOptions } from './types';
import { validatePattern, generatePhoneNumbers } from './utils/generator';
import { generateVCF } from './utils/vcf';

// Since we are in a browser, we use Blob/URL for downloading
const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Reusable Collapsible Card Component
interface CollapsibleCardProps {
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const CollapsibleCard = ({ 
  title, 
  icon, 
  children, 
  isOpen, 
  onToggle 
}: CollapsibleCardProps) => {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-300 mt-2">
      <button 
        onClick={onToggle}
        className={`flex items-center justify-between w-full p-3 transition-colors ${
          isOpen ? 'bg-slate-50 text-emerald-600' : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
        type="button"
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {isOpen && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  // State
  // Default pattern: 10 chars, starting with 05, rest underscores
  const [pattern, setPattern] = useState<string>('05________');
  // Initialize count as empty string so the input is empty on load
  const [count, setCount] = useState<number | string>('');
  const [contactNamePrefix, setContactNamePrefix] = useState<string>('TEST <');
  const [generatedContacts, setGeneratedContacts] = useState<GeneratedContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'preview'>('form');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Advanced Settings State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [repetitionDensity, setRepetitionDensity] = useState<number>(0.3); // Default to Balanced (0.3)

  // Input Refs for the 10-slot grid
  const slotRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Clear messages on change
  useEffect(() => {
    if (error) setError(null);
    if (successMsg) setSuccessMsg(null);
  }, [pattern, count, contactNamePrefix, repetitionDensity]);

  const handlePatternSlotChange = (index: number, value: string) => {
    // Prevent changing the fixed prefix '05' (indices 0 and 1)
    if (index < 2) return;

    // Only allow digits or underscore
    let char = value;
    
    // If user pasted multiple chars or typed fast, take the last character entered
    if (value.length > 1) {
      char = value.slice(-1);
    }

    // Validate: 0-9 or _ or empty (empty becomes _)
    if (char === '') char = '_';
    if (!/^[0-9_]$/.test(char)) return;

    // Update state
    const newPatternArray = pattern.split('');
    // Ensure array is 10 chars long (safety)
    while (newPatternArray.length < 10) newPatternArray.push('_');
    
    newPatternArray[index] = char;
    setPattern(newPatternArray.join(''));

    // Auto-focus next slot if it's a digit and we are not at the end
    if (index < 9 && /^[0-9_]$/.test(char)) {
      slotRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Backspace navigation
    if (e.key === 'Backspace') {
      if (index < 2) return; // Safety check for fixed slots
      
      if (pattern[index] === '_' && index > 2) {
         e.preventDefault();
         const newPatternArray = pattern.split('');
         newPatternArray[index - 1] = '_';
         setPattern(newPatternArray.join(''));
         slotRefs.current[index - 1]?.focus();
      } else if (pattern[index] !== '_') {
        // If current slot has value, just clear it to '_'
        e.preventDefault();
        const newPatternArray = pattern.split('');
        newPatternArray[index] = '_';
        setPattern(newPatternArray.join(''));
      }
    }
    // Arrow keys navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      if (index - 1 >= 2) {
        slotRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowRight' && index < 9) {
      slotRefs.current[index + 1]?.focus();
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow clearing the input to show placeholder
    if (value === '') {
      setCount('');
      return;
    }

    const val = parseInt(value);
    
    if (!isNaN(val)) {
      // Limit to max 10000
      if (val > 10000) {
        setCount(10000);
      } else if (val < 0) {
        setCount(0);
      } else {
        setCount(val);
      }
    }
  };

  const validateInputs = (): boolean => {
    const options: GenerationOptions | undefined = showAdvanced ? {
      repetitionDensity
    } : undefined;

    const patternError = validatePattern(pattern, options);
    if (patternError) {
      setError(patternError);
      return false;
    }

    const countNum = Number(count);
    if (countNum <= 0 || countNum > 10000) {
      setError("العدد يجب أن يكون بين 1 و 10000.");
      return false;
    }

    if (!contactNamePrefix.trim()) {
      setError("يرجى إدخال اسم لتمييز جهات الاتصال.");
      return false;
    }
    
    return true;
  };

  const startGeneration = (mode: 'preview' | 'save') => {
    if (!validateInputs()) return;
    setIsGenerating(true);
    setError(null);
    setSuccessMsg(null);

    const options: GenerationOptions | undefined = showAdvanced ? {
      repetitionDensity
    } : undefined;

    const config: GenerationConfig = {
      pattern,
      count: Number(count),
      contactNamePrefix
    };

    // Use timeout to allow UI to show loading state
    setTimeout(() => {
      try {
        // Create a set of existing numbers to prevent duplication
        const existingNumbersSet = new Set<string>(generatedContacts.map(c => c.number));
        
        // Generate NEW numbers only
        const newContacts = generatePhoneNumbers(config, options, existingNumbersSet);
        
        if (newContacts.length === 0) {
          setError("لم يتم توليد أرقام جديدة. قد تكون جميع الاحتمالات لهذا النمط مستخدمة بالفعل في القائمة الحالية.");
          setIsGenerating(false);
          return;
        }

        // Combine existing and new contacts
        const combinedContacts = [...generatedContacts, ...newContacts];

        // Sort combined list logically (Ascending)
        combinedContacts.sort((a, b) => a.number.localeCompare(b.number));

        // Re-index IDs to be sequential based on the sorted list
        const reIndexedContacts = combinedContacts.map((c, index) => ({
          ...c,
          id: (index + 1).toString().padStart(4, '0'),
          // Update name if it's generic, or keep it if custom (here we regenerate name to keep order)
          name: `${(index + 1).toString().padStart(4, '0')} ${contactNamePrefix}` 
        }));

        if (mode === 'preview') {
          setGeneratedContacts(reIndexedContacts);
          setSuccessMsg(`تم إضافة ${newContacts.length} رقم جديد إلى القائمة.`);
          setViewMode('preview');
        } else {
          // Generate VCF ONLY for the NEWLY generated/saved batch? 
          // Usually 'Save' implies saving the current session results. 
          // To be safe, we save the *new* ones, or all unsaved?
          // Let's save the *newly generated* batch specifically as per standard UX, 
          // or all 'unsaved' ones.
          
          // Implementation: We download the *New* ones only to avoid re-saving duplicates to phone
          // But we update the state of ALL to saved?
          // Let's download the 'newContacts' batch.
          
          const vcfData = generateVCF(newContacts);
          const fileName = `contacts_${contactNamePrefix}_part_${new Date().getTime()}.vcf`;
          downloadFile(vcfData, fileName);
          
          // Mark the new ones as saved in the main list
          const finalContacts = reIndexedContacts.map(c => {
            // If it was in the new batch, mark saved. If it was already saved, keep it.
            const isNew = newContacts.some(nc => nc.number === c.number);
            if (isNew) return { ...c, isSaved: true };
            return c;
          });
          
          setGeneratedContacts(finalContacts);
          
          setSuccessMsg(`تم توليد وحفظ ${newContacts.length} رقم جديد.`);
          setViewMode('preview');
        }
      } catch (err: any) {
        setError(err.message || "حدث خطأ غير متوقع أثناء التوليد.");
      } finally {
        setIsGenerating(false);
      }
    }, 500);
  };

  const saveCurrentList = () => {
    try {
      // Save all contacts in list
      if (generatedContacts.length === 0) return;
      const vcfData = generateVCF(generatedContacts);
      const fileName = `contacts_${contactNamePrefix}_full_${new Date().getTime()}.vcf`;
      downloadFile(vcfData, fileName);
      
      // Update state to mark these contacts as saved
      setGeneratedContacts(prev => prev.map(c => ({ ...c, isSaved: true })));
      
      setSuccessMsg(`تم حفظ ملف جهات الاتصال (${generatedContacts.length} رقم).`);
    } catch (err) {
      setError("فشل في حفظ الملف.");
    }
  };

  const handleClearAppList = () => {
    if (generatedContacts.length === 0) return;
    
    setTimeout(() => {
      const confirmMsg = `هل أنت متأكد من مسح القائمة بالكامل من التطبيق؟\n\nلن يؤثر هذا على جهات الاتصال المحفوظة في هاتفك.`;
      
      if (window.confirm(confirmMsg)) {
        setGeneratedContacts([]);
        setViewMode('form');
        setSuccessMsg("تم تصفية القائمة من التطبيق.");
        setError(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleResetSavedStatus = () => {
    // This function simulates "Deleting from phone" by removing the "Saved" indicator
    // It keeps the numbers in the app, but treats them as if they are not on the phone anymore.
    if (generatedContacts.length === 0) return;
    
    setTimeout(() => {
      const confirmMsg = `هل تريد إلغاء حالة "محفوظ" لجميع الأرقام؟\n\nسيتم اعتبار الأرقام غير موجودة في الهاتف، ولكن ستبقى في قائمة التطبيق.`;
      
      if (window.confirm(confirmMsg)) {
        setGeneratedContacts(prev => prev.map(c => ({ ...c, isSaved: false })));
        setSuccessMsg("تم إعادة تعيين الحالة. جميع الأرقام تعتبر الآن غير محفوظة.");
      }
    }, 50);
  }

  const handleDeleteUnsaved = () => {
    const unsavedCount = generatedContacts.filter(c => !c.isSaved).length;
    
    if (unsavedCount === 0) {
      if (generatedContacts.length > 0) {
        setError("جميع الأرقام الموجودة تم حفظها مسبقاً.");
        setTimeout(() => setError(null), 3000);
      } else {
        setError("القائمة فارغة.");
      }
      return;
    }

    setTimeout(() => {
      const confirmMsg = `هل أنت متأكد من حذف الأرقام غير المحفوظة فقط (${unsavedCount} رقم)؟`;
      
      if (window.confirm(confirmMsg)) {
        const remainingContacts = generatedContacts.filter(c => c.isSaved);
        
        // Re-index remaining
        const reIndexed = remainingContacts.map((c, idx) => ({
             ...c,
             id: (idx + 1).toString().padStart(4, '0'),
             name: `${(idx + 1).toString().padStart(4, '0')} ${contactNamePrefix}` 
        }));

        setGeneratedContacts(reIndexed);
        
        if (reIndexed.length === 0) {
          setViewMode('form');
          setSuccessMsg("تم حذف الأرقام غير المحفوظة.");
        } else {
          setSuccessMsg(`تم حذف ${unsavedCount} رقم غير محفوظ.`);
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const openWhatsApp = (number: string) => {
    window.open(`https://wa.me/${number}`, '_blank');
  };

  const openTelegram = (number: string) => {
    window.open(`https://t.me/+${number}`, '_blank');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy', err);
    });
  };

  const copyAllNumbers = () => {
    if (generatedContacts.length === 0) return;
    const allNumbers = generatedContacts.map(c => c.number).join('\n');
    navigator.clipboard.writeText(allNumbers).then(() => {
      setSuccessMsg("تم نسخ جميع الأرقام إلى الحافظة.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }).catch(() => {
      setError("فشل نسخ الأرقام.");
    });
  };

  // Helper to format density label with discrete steps
  const getDensityLabel = (val: number) => {
    const v = Math.round(val * 10) / 10;
    
    if (v <= 0.1) return 'صارم جداً: يمنع التكرار قدر الإمكان';
    if (v <= 0.2) return 'صارم: تكرار نادر جداً';
    if (v <= 0.3) return 'متوازن: توزيع طبيعي (مستحسن)';
    if (v <= 0.4) return 'متوازن بمرونة: يسمح بتكرار بسيط';
    if (v <= 0.5) return 'متوسط: تكرار الأرقام مقبول';
    if (v <= 0.6) return 'فوق المتوسط: تكرار الأرقام شائع';
    if (v <= 0.7) return 'تكرار عالي: الأرقام المتكررة واضحة';
    if (v <= 0.8) return 'حر: قيود قليلة على التكرار';
    if (v <= 0.9) return 'شبه عشوائي: قيود نادرة';
    return 'عشوائي تماماً: لا توجد قيود';
  };

  // Helper for color coding the density badge
  const getDensityColor = (val: number) => {
    if (val <= 0.3) return 'bg-emerald-100 text-emerald-700';
    if (val <= 0.6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  }

  // Render the 10-slot pattern input
  const renderPatternInputs = () => {
    const slots = [];
    for (let i = 0; i < 10; i++) {
      const char = pattern[i] || '_';
      const isFixed = i < 2; // First two digits are fixed (05)
      
      slots.push(
        <input
          key={i}
          ref={(el) => { slotRefs.current[i] = el; }}
          type="text"
          lang="en"
          inputMode={isFixed ? undefined : "numeric"}
          value={char === '_' ? '' : char}
          onChange={(e) => handlePatternSlotChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={isFixed}
          readOnly={isFixed}
          className={`w-8 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none transition-colors 
            ${isFixed 
              ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none' 
              : (char !== '_' ? 'border-emerald-500 bg-white text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-400 placeholder-slate-300')
            } 
            ${!isFixed && 'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'}`}
          placeholder={char} 
        />
      );
    }
    return (
      <div className="flex flex-row justify-center gap-1.5 sm:gap-2" dir="ltr">
        {slots}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 ${viewMode === 'preview' ? 'pb-40' : 'pb-10'}`}>
      
      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
           <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-slate-700">
              <div className="relative flex items-center justify-center">
                 {/* Outer ring */}
                 <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
                 {/* Icon in middle */}
                 <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-pulse" />
                 </div>
              </div>
              <div className="text-center space-y-2">
                 <h3 className="text-lg font-bold text-white">جاري التوليد...</h3>
                 <p className="text-slate-400 text-sm">يتم معالجة الأرقام، يرجى الانتظار.</p>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-10 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 relative flex items-center justify-center">
          
          {viewMode === 'preview' && (
             <button 
               onClick={() => setViewMode('form')} 
               className="absolute left-4 top-1/2 -translate-y-1/2 text-sm bg-slate-700 px-3 py-1 rounded-full hover:bg-slate-600 transition"
             >
               عودة
             </button>
          )}

          <div className="flex items-center gap-3">
             <div className="relative">
               <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg">
                 <Phone className="w-5 h-5 text-slate-900 fill-current" />
               </div>
               <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-slate-900">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
               </div>
             </div>
            <h1 className="text-xl font-bold tracking-wide">WhatsApp X</h1>
          </div>
          
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}
        
        {successMsg && (
          <div className="bg-green-50 border-r-4 border-green-500 p-4 rounded-lg flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 font-medium">{successMsg}</p>
          </div>
        )}

        {viewMode === 'form' ? (
          <div className="space-y-6 animate-fade-in">
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
              
              {/* Pattern Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  نمط الرقم (10 خانات)
                </label>
                
                {/* 10 Slots Grid */}
                {renderPatternInputs()}

                <p className="text-xs text-slate-500 mt-2 text-center">
                  الخانتان 05 ثابتتان. أدخل باقي الأرقام أو اتركها فارغة (_).
                </p>
              </div>

              {/* Grid for Count & Prefix */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    العدد (Max 10000)
                  </label>
                  <input
                    type="number"
                    lang="en"
                    pattern="\d*"
                    inputMode="numeric"
                    value={count}
                    onChange={handleCountChange}
                    style={{ direction: 'ltr' }}
                    className="w-full text-center bg-slate-50 border-2 border-slate-200 rounded-xl py-2 focus:border-emerald-500 outline-none placeholder:text-slate-300 font-sans [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    اسم التمييز
                  </label>
                  <input
                    type="text"
                    value={contactNamePrefix}
                    onChange={(e) => setContactNamePrefix(e.target.value)}
                    className="w-full text-center bg-slate-50 border-2 border-slate-200 rounded-xl py-2 focus:border-emerald-500 outline-none"
                    placeholder="example"
                  />
                </div>
              </div>

              {/* Advanced Options Collapsible Card */}
              <div className="pt-2">
                <CollapsibleCard
                  title="خيارات متقدمة"
                  icon={<Settings className="w-4 h-4" />}
                  isOpen={showAdvanced}
                  onToggle={() => setShowAdvanced(!showAdvanced)}
                >
                  {/* Density Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Sliders className="w-4 h-4" />
                        كثافة التكرار
                      </label>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${getDensityColor(repetitionDensity)}`}>
                        {Math.round(repetitionDensity * 10)} / 10
                      </span>
                    </div>
                    
                    <div className="relative pt-1 pb-1">
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.1" 
                        value={repetitionDensity}
                        onChange={(e) => setRepetitionDensity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                          <span>صارم</span>
                          <span>متوازن</span>
                          <span>عشوائي</span>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-lg text-xs text-slate-600 text-center border border-slate-200 shadow-sm mt-2">
                      {getDensityLabel(repetitionDensity)}
                    </div>
                  </div>
                </CollapsibleCard>
              </div>

            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => startGeneration('save')}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <RefreshCw className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5" />}
                <span>{isGenerating ? 'جاري التوليد...' : 'توليد وتراكم جهات الاتصال'}</span>
              </button>

              <button
                onClick={() => startGeneration('preview')}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-3 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <RefreshCw className="animate-spin w-5 h-5" /> : <List className="w-5 h-5" />}
                <span>{isGenerating ? 'جاري التوليد...' : 'توليد وإضافة للقائمة'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Results Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800">النتائج ({generatedContacts.length})</h2>
                <p className="text-xs text-slate-500">البادئة: {contactNamePrefix}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={copyAllNumbers}
                  className="text-blue-500 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                  title="نسخ الكل"
                >
                  <Files className="w-5 h-5" />
                  <span className="text-xs font-bold">نسخ الكل</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {generatedContacts.slice(0, 100).map((contact) => (
                <div 
                  key={contact.id} 
                  className={`p-4 rounded-xl shadow-sm border flex items-center justify-between transition-colors ${
                    contact.isSaved 
                      ? 'bg-emerald-50 border-emerald-200/60' 
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                      contact.isSaved 
                        ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {contact.id}
                    </div>
                    <div>
                      <div className={`font-mono font-bold text-lg dir-ltr flex items-center gap-2 ${
                        contact.isSaved ? 'text-emerald-900' : 'text-slate-700'
                      }`}>
                        {contact.number}
                        {contact.isSaved && (
                          <span title="تم الحفظ" className="animate-fade-in">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <span className={`font-bold ${contact.isSaved ? 'text-emerald-700/70' : ''}`}>{contact.name}</span>
                        {!contact.isSaved && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">غير محفوظ</span>}
                        {contact.isSaved && <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">محفوظ</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => copyToClipboard(contact.number, contact.id)}
                      className={`p-2 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                        copiedId === contact.id 
                          ? 'bg-emerald-100 text-emerald-600 scale-110' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="نسخ الرقم"
                    >
                      {copiedId === contact.id ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                    </button>
                    
                    <button 
                      onClick={() => openWhatsApp(contact.number)}
                      className="bg-green-50 text-green-600 p-2 rounded-lg hover:bg-green-100 transition"
                      title="فتح واتساب"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </button>

                    <button 
                      onClick={() => openTelegram(contact.number)}
                      className="bg-blue-50 text-blue-500 p-2 rounded-lg hover:bg-blue-100 transition"
                      title="فتح تيلجرام"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}
              {generatedContacts.length > 100 && (
                 <div className="text-center py-4 text-slate-400 text-sm">
                   + {generatedContacts.length - 100} رقم آخر (تم عرض أول 100 فقط للأداء)
                 </div>
              )}
              {generatedContacts.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  لا توجد نتائج.
                </div>
              )}
            </div>

            {/* Sticky Action for Preview Mode */}
             <div className="sticky bottom-4 z-20 space-y-3">
                <button
                  type="button"
                  onClick={saveCurrentList}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-xl hover:bg-emerald-700 transition"
                >
                  <Download className="w-5 h-5" />
                  <span>حفظ القائمة الحالية (VCF)</span>
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                   {/* Delete Saved / Reset Status (Simulate Delete from Phone) */}
                  <button
                    type="button"
                    onClick={handleResetSavedStatus}
                    className="w-full flex items-center justify-center gap-2 bg-orange-100 text-orange-700 font-bold py-3 rounded-xl shadow-md hover:bg-orange-200 transition"
                  >
                    <ArchiveRestore className="w-5 h-5" />
                    <span className="text-sm">إلغاء حالة الحفظ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteUnsaved}
                    className="w-full flex items-center justify-center gap-2 bg-amber-100 text-amber-700 font-bold py-3 rounded-xl shadow-md hover:bg-amber-200 transition"
                  >
                    <Eraser className="w-5 h-5" />
                    <span className="text-sm">حذف غير المحفوظة</span>
                  </button>
                </div>

                {/* Clear App List Button (Full Reset) */}
                <button
                    type="button"
                    onClick={handleClearAppList}
                    className="w-full flex items-center justify-center gap-2 bg-red-100 text-red-600 font-bold py-3 rounded-xl shadow-md hover:bg-red-200 transition"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-sm">مسح القائمة من التطبيق</span>
                  </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;