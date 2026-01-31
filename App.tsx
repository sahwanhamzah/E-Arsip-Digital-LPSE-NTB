
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileCheck, 
  FileText, 
  Plus, 
  Search, 
  Menu, 
  X,
  Clock,
  Edit3,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Share2,
  Trash2,
  Eye,
  Bot,
  Loader2,
  Upload,
  Paperclip,
  File as FileIcon,
  LogOut,
  User as UserIcon,
  Lock,
  EyeOff,
  Building2,
  CheckCircle2,
  QrCode,
  Download,
  Settings,
  Database,
  CloudDownload,
  CloudUpload,
  RefreshCw,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Surat, KategoriSurat, StatusSurat, Stats, User, UserRole } from './types';
import { summarizeDocument } from './services/geminiService';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// --- Constants for Validation ---
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'image/jpeg', 
  'image/png', 
  'image/jpg'
];

// --- Mock Data for Charts ---
const CHART_DATA = [
  { name: 'Jan', masuk: 12, keluar: 8 },
  { name: 'Feb', masuk: 19, keluar: 12 },
  { name: 'Mar', masuk: 15, keluar: 22 },
  { name: 'Apr', masuk: 25, keluar: 18 },
  { name: 'Mei', masuk: 20, keluar: 15 },
];

// --- Mock Data ---
const INITIAL_DATA: Surat[] = [
  { id: '1', noSurat: '001/LPSE-NTB/I/2024', kodeHal: '800.1.3', perihal: 'Undangan Rapat Koordinasi IT', pihak: 'Kominfo NTB', tanggal: '2024-01-15', tanggalSurat: '2024-01-10', tanggalTerima: '2024-01-15', kategori: 'Masuk', status: 'Selesai', ttd: 'Kepala Dinas', isiRingkas: 'Koordinasi teknis implementasi server baru.' },
  { id: '2', noSurat: '002/LPSE-NTB/I/2024', kodeHal: '027', perihal: 'Permohonan Verifikasi Berkas SIKAP', pihak: 'PT. Maju Bersama', tanggal: '2024-01-18', tanggalSurat: '2024-01-16', tanggalTerima: '2024-01-18', kategori: 'Masuk', status: 'Proses', ttd: '-', isiRingkas: 'Verifikasi kualifikasi penyedia jasa.' },
  { id: '3', noSurat: 'OUT-001/LPSE-NTB/I/2024', kodeHal: '050', perihal: 'Jawaban Sanggah Tender Jalan', pihak: 'PT. Konstruksi Jaya', tanggal: '2024-01-20', tanggalSurat: '2024-01-20', tanggalTerima: '2024-01-20', kategori: 'Keluar', status: 'Selesai', ttd: 'Kabag LPSE', isiRingkas: 'Penolakan sanggah berdasarkan hasil evaluasi.' },
];

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Main App State
  const [suratList, setSuratList] = useState<Surat[]>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'semua' | 'masuk' | 'keluar' | 'system'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  
  // Advanced Filter State
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState<Surat | null>(null);
  const [reportType, setReportType] = useState<'Semua' | 'Masuk' | 'Keluar'>('Semua');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<Partial<Surat>>({
    noSurat: '', kodeHal: '', perihal: '', pihak: '',
    tanggal: today,
    tanggalSurat: today,
    tanggalTerima: today,
    kategori: 'Masuk', status: 'Proses', ttd: '',
    fileName: '', fileData: '', fileType: ''
  });

  // Effect to reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, startDate, endDate, activeTab]);

  // Filter Logic
  const filteredList = useMemo(() => {
    if (activeTab === 'system') return [];
    return suratList.filter(s => {
      const categoryMatch = activeTab === 'dashboard' || activeTab === 'semua' || s.kategori.toLowerCase() === activeTab;
      const searchMatch = 
        s.perihal.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.noSurat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.pihak.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = filterStatus === 'Semua' || s.status === filterStatus;
      const dateMatch = (!startDate || s.tanggal >= startDate) && (!endDate || s.tanggal <= endDate);
      
      return categoryMatch && searchMatch && statusMatch && dateMatch;
    });
  }, [suratList, activeTab, searchTerm, filterStatus, startDate, endDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  const stats: Stats = useMemo(() => ({
    total: suratList.length,
    masuk: suratList.filter(s => s.kategori === 'Masuk').length,
    keluar: suratList.filter(s => s.kategori === 'Keluar').length,
    proses: suratList.filter(s => s.status === 'Proses').length,
  }), [suratList]);

  const recentArchives = useMemo(() => {
    return [...suratList].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4);
  }, [suratList]);

  // Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError('');
    setTimeout(() => {
      if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
        setCurrentUser({ username: 'admin', fullName: 'Administrator LPSE', role: 'Administrator', lastLogin: new Date().toLocaleString() });
      } else if (loginForm.username === 'staf' && loginForm.password === 'staf123') {
        setCurrentUser({ username: 'staf', fullName: 'Siti Rohana (Staf)', role: 'User', lastLogin: new Date().toLocaleString() });
      } else {
        setLoginError('Username atau password salah.');
      }
      setIsLoginLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
    setActiveTab('dashboard');
  };

  const resetFilters = () => {
    setFilterStatus('Semua');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const handleOpenAdd = () => {
    if (currentUser?.role !== 'Administrator') return;
    
    // SMART CATEGORY DEFAULTING
    const defaultKategori: KategoriSurat = activeTab === 'keluar' ? 'Keluar' : 'Masuk';
    
    setFormData({ 
      noSurat: '', kodeHal: '', perihal: '', pihak: '', 
      tanggal: today, 
      tanggalSurat: today, 
      tanggalTerima: today, 
      kategori: defaultKategori, 
      status: 'Proses', ttd: '', 
      fileName: '', fileData: '', fileType: '' 
    });
    setSelectedSurat(null);
    setShowFormModal(true);
  };

  const handleEdit = (item: Surat) => {
    if (currentUser?.role !== 'Administrator') return;
    setFormData(item);
    setSelectedSurat(item);
    setShowFormModal(true);
  };

  const handleDelete = (id: string) => {
    if (currentUser?.role !== 'Administrator') return;
    if (window.confirm('Apakah Anda yakin ingin menghapus arsip ini?')) {
      setSuratList(prev => prev.filter(s => s.id !== id));
    }
  };

  const viewFile = (item: Surat) => {
    setSelectedSurat(item);
    setShowDetailModal(true);
  };

  const handleGenerateReport = (type: 'Semua' | 'Masuk' | 'Keluar') => {
    setReportType(type);
    setShowReportDropdown(false);
    setShowPrintPreview(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Format file tidak didukung. Harap gunakan PDF, DOCX, atau Gambar (JPG/PNG).');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert('Ukuran file terlalu besar. Maksimal ukuran yang diizinkan adalah 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, fileName: file.name, fileType: file.type, fileData: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = formData as Surat;
    if (selectedSurat) {
      setSuratList(prev => prev.map(s => s.id === selectedSurat.id ? { ...data, id: selectedSurat.id } : s));
    } else {
      setSuratList(prev => [{ ...data, id: Date.now().toString() }, ...prev]);
    }
    setShowFormModal(false);
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(suratList, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_EArsip_LPSE_NTB.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          if (window.confirm('Restorasi akan menimpa data saat ini. Lanjutkan?')) {
            setSuratList(json);
            alert('Restorasi berhasil!');
          }
        }
      } catch (err) { alert('Gagal membaca file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- LOGIN UI ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative bg-slate-900">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105" style={{ backgroundImage: "url('https://storage.ntbprov.go.id/biropbj/media/kantor-gubernur-ntb.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-blue-900/40 backdrop-blur-[2px]"></div>
        </div>
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in duration-700 relative z-10">
          <div className="p-12 bg-gradient-to-br from-white/5 to-transparent flex flex-col justify-between relative hidden lg:flex border-r border-white/5">
             <div className="relative z-10">
                <div className="bg-[#EAB308] w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-yellow-500/30 ring-4 ring-yellow-500/20"><ShieldCheck className="w-8 h-8 text-[#0F172A]" /></div>
                <h1 className="text-4xl font-extrabold text-white leading-tight drop-shadow-md">Sistem E-Arsip <br /><span className="text-blue-400">Digital LPSE NTB</span></h1>
                <p className="mt-4 text-slate-300 text-lg font-medium">Manajemen arsip surat dinas yang modern, aman, dan efisien untuk integritas pengadaan.</p>
             </div>
             <div className="relative z-10 mt-12">
                <div className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
                   <div className="bg-emerald-500/20 p-2.5 rounded-xl"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div>
                   <div><p className="text-sm text-white font-bold">Terverifikasi Sistem</p><p className="text-xs text-slate-400 font-medium">Infrastruktur Digital Pemprov NTB</p></div>
                </div>
                <div className="mt-10 flex items-center gap-3"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div><p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Pemerintah Provinsi Nusa Tenggara Barat</p></div>
             </div>
          </div>
          <div className="p-8 lg:p-16 flex flex-col justify-center bg-white">
            <div className="mb-10 text-center lg:text-left"><h2 className="text-3xl font-black text-slate-900 tracking-tight">Selamat Datang</h2><p className="text-slate-500 mt-2 font-medium">Silakan akses kredensial Anda untuk melanjutkan</p></div>
            <form onSubmit={handleLogin} className="space-y-6">
               {loginError && <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2"><X size={18} />{loginError}</div>}
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Username</label>
                  <div className="relative group"><UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} /><input required type="text" placeholder="admin / staf" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-semibold text-slate-800" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} /></div>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Password</label>
                  <div className="relative group"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} /><input required type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-semibold text-slate-800" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
               </div>
               <button disabled={isLoginLoading} type="submit" className="w-full bg-[#0F172A] hover:bg-blue-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 flex items-center justify-center gap-3">{isLoginLoading ? <Loader2 size={20} className="animate-spin" /> : <>Akses Dasbor</>}</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP UI ---
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-[#0F172A] transition-all duration-300 flex flex-col z-30 shadow-2xl no-print`}>
        <div className="p-6 flex items-center gap-4 border-b border-white/5">
          <div className="bg-[#EAB308] p-2 rounded-xl shrink-0"><ShieldCheck className="w-6 h-6 text-[#0F172A]" /></div>
          {isSidebarOpen && <div className="truncate"><h1 className="font-bold text-white text-lg leading-none">E-Arsip Digital</h1><span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">LPSE PROV NTB</span></div>}
        </div>
        <nav className="flex-1 px-3 mt-8 space-y-2">
          <SidebarLink icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('dashboard')} />
          <SidebarLink icon={<FileText />} label="Semua Arsip" active={activeTab === 'semua'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('semua')} />
          <SidebarLink icon={<FileCheck />} label="Surat Masuk" active={activeTab === 'masuk'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('masuk')} />
          <SidebarLink icon={<Share2 />} label="Surat Keluar" active={activeTab === 'keluar'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('keluar')} />
          {currentUser.role === 'Administrator' && <SidebarLink icon={<Settings />} label="Sistem" active={activeTab === 'system'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('system')} />}
        </nav>
        <div className="p-4 mt-auto">
          <div className={`bg-slate-800/50 rounded-2xl border border-white/5 transition-all ${isSidebarOpen ? 'p-4' : 'p-2'}`}>
            {isSidebarOpen ? (
              <>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{currentUser.role}</p>
                <p className="text-white font-semibold text-sm truncate">{currentUser.fullName}</p>
                <button onClick={handleLogout} className="mt-4 flex items-center gap-2 text-rose-400 hover:text-rose-300 text-xs font-bold transition-colors"><LogOut size={14} />Logout</button>
              </>
            ) : <button onClick={handleLogout} className="w-full flex justify-center text-rose-400"><LogOut size={20}/></button>}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Menu size={20} /></button>
            <h2 className="text-xl font-bold text-slate-800 capitalize tracking-tight">{activeTab === 'system' ? 'Manajemen Sistem' : activeTab}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500" />
              <input type="text" placeholder="Cari perihal, nomor, atau instansi..." className="pl-10 pr-4 py-2.5 bg-slate-100 border-none focus:ring-2 focus:ring-blue-500 rounded-xl text-sm w-80 transition-all outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            
            {activeTab !== 'dashboard' && activeTab !== 'system' && (
              <button 
                onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm font-bold ${isFilterExpanded ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <Filter size={18} />
                <span className="hidden md:inline">Filter</span>
              </button>
            )}

            <div className="relative">
               <button onClick={() => setShowReportDropdown(!showReportDropdown)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all font-bold text-sm"><Printer size={18} /><span>Laporan</span><ChevronDown size={14} /></button>
               {showReportDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl py-3 z-[60]">
                     <p className="px-5 py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Jenis Laporan</p>
                     <button onClick={() => handleGenerateReport('Semua')} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><FileText size={16} className="text-blue-500" /> Semua Arsip</button>
                     <button onClick={() => handleGenerateReport('Masuk')} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><FileCheck size={16} className="text-emerald-500" /> Surat Masuk</button>
                     <button onClick={() => handleGenerateReport('Keluar')} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><Share2 size={16} className="text-indigo-500" /> Surat Keluar</button>
                  </div>
               )}
            </div>

            {currentUser.role === 'Administrator' && (
              <button onClick={handleOpenAdd} className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-xl shadow-slate-200 font-bold text-sm"><Plus size={18} /><span>Arsip Baru</span></button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 no-print">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-700">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Total Dokumen" value={stats.total} icon={<FileText />} color="text-blue-600" bg="bg-blue-100" />
                  <StatCard label="Surat Masuk" value={stats.masuk} icon={<FileCheck />} color="text-emerald-600" bg="bg-emerald-100" />
                  <StatCard label="Surat Keluar" value={stats.keluar} icon={<Share2 />} color="text-indigo-600" bg="bg-indigo-100" />
                  <StatCard label="Butuh Verifikasi" value={stats.proses} icon={<Clock />} color="text-amber-600" bg="bg-amber-100" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Analytics Chart */}
                  <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[450px]">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Tren Volume Kearsipan</h3>
                        <p className="text-sm text-slate-400 font-medium">Monitoring surat masuk & keluar 5 bulan terakhir</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl text-slate-500"><TrendingUp size={20} /></div>
                    </div>
                    <div className="flex-1 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={CHART_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                          <Area type="monotone" dataKey="masuk" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMasuk)" />
                          <Area type="monotone" dataKey="keluar" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorKeluar)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI Insight & Status Analysis */}
                  <div className="flex flex-col gap-8">
                    {/* Status Distribution */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                      <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity size={18} className="text-blue-500" /> Penyelesaian Dokumen
                      </h4>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-500">
                            <span>SURAT SELESAI</span>
                            <span>{stats.total > 0 ? Math.round((suratList.filter(s => s.status === 'Selesai').length / stats.total) * 100) : 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.total > 0 ? (suratList.filter(s => s.status === 'Selesai').length / stats.total) * 100 : 0}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-500">
                            <span>DALAM PROSES</span>
                            <span>{stats.total > 0 ? Math.round((stats.proses / stats.total) * 100) : 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.total > 0 ? (stats.proses / stats.total) * 100 : 0}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Insight Card */}
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform"><Bot size={120} /></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-blue-500 p-2 rounded-xl"><Bot size={18} /></div>
                          <h4 className="font-bold text-sm tracking-wide">AI DATA INSIGHT</h4>
                        </div>
                        <p className="text-blue-100 text-sm leading-relaxed font-medium">
                          Berdasarkan data Januari, efisiensi verifikasi meningkat sebesar 15%. Dokumen perihal IT memerlukan perhatian khusus minggu ini.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activities List */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Aktivitas Terakhir</h3>
                      <p className="text-sm text-slate-400 font-medium">Daftar arsip yang baru saja ditambahkan</p>
                    </div>
                    <button onClick={() => setActiveTab('semua')} className="text-blue-600 text-sm font-bold hover:underline">Lihat Semua Arsip</button>
                  </div>
                  <div className="p-4">
                    {recentArchives.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 mb-2">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.kategori === 'Masuk' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {item.kategori === 'Masuk' ? <FileCheck size={20}/> : <Share2 size={20}/>}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm line-clamp-1">{item.perihal}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{item.noSurat}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{item.pihak}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            <p className="text-xs font-bold text-slate-500">{item.tanggalSurat}</p>
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">Tgl. Dokumen</p>
                          </div>
                          <button onClick={() => viewFile(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm"><Eye size={18}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Other Tabs Rendering... */}
            {activeTab !== 'dashboard' && activeTab !== 'system' && (
               <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto p-4">
                     <table className="w-full text-left border-separate border-spacing-y-3">
                        <thead>
                           <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-6">
                              <th className="px-6 py-3">Rincian Dokumen</th>
                              <th className="px-6 py-3">Instansi</th>
                              <th className="px-6 py-3">Tgl. Dokumen</th>
                              <th className="px-6 py-3 text-center">Status</th>
                              <th className="px-6 py-3 text-right">Aksi</th>
                           </tr>
                        </thead>
                        <tbody>
                           {paginatedList.map((item) => (
                              <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                                 <td className="px-6 py-5 first:rounded-l-2xl border-y border-l border-transparent group-hover:border-slate-200">
                                    <div className="flex items-center gap-4">
                                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.kategori === 'Masuk' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                          {item.kategori === 'Masuk' ? <FileCheck size={24}/> : <Share2 size={24}/>}
                                       </div>
                                       <div>
                                          <div className="font-bold text-slate-800 text-sm line-clamp-1">{item.perihal}</div>
                                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">{item.noSurat}</div>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-5 border-y border-transparent group-hover:border-slate-200 text-sm font-semibold text-slate-600">{item.pihak}</td>
                                 <td className="px-6 py-5 border-y border-transparent group-hover:border-slate-200 text-sm text-slate-500 font-medium">{item.tanggalSurat}</td>
                                 <td className="px-6 py-5 border-y border-transparent group-hover:border-slate-200 text-center"><StatusBadge status={item.status} /></td>
                                 <td className="px-6 py-5 last:rounded-r-2xl border-y border-r border-transparent group-hover:border-slate-200 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                       <button onClick={() => viewFile(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Eye size={18}/></button>
                                       {currentUser.role === 'Administrator' && (
                                       <>
                                          <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Edit3 size={18}/></button>
                                          <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                                       </>
                                       )}
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                     
                     {filteredList.length === 0 && (
                        <div className="py-20 text-center"><Database className="mx-auto text-slate-200 mb-4" size={64} /><p className="text-slate-400 font-bold italic">Tidak ditemukan arsip.</p></div>
                     )}

                     {/* Pagination Controls... */}
                     {filteredList.length > 0 && (
                        <div className="mt-4 px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                           <div className="text-xs font-bold text-slate-400">
                              Menampilkan <span className="text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="text-slate-700">{Math.min(currentPage * itemsPerPage, filteredList.length)}</span> dari <span className="text-slate-700">{filteredList.length}</span> arsip
                           </div>
                           <div className="flex items-center gap-2">
                              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={18} /></button>
                              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={18} /></button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {/* System Tab... */}
            {activeTab === 'system' && (
               <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="flex flex-col gap-2"><h3 className="text-2xl font-black text-slate-900 tracking-tight">Utilitas Sistem</h3><p className="text-slate-500 font-medium">Kelola integritas data dan cadangan sistem arsip digital.</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
                        <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 mb-6"><CloudDownload size={32} /></div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">Cadangkan Data</h4>
                        <p className="text-slate-500 text-sm mb-8 flex-1">Ekspor seluruh database arsip ke dalam file JSON untuk dicadangkan secara offline.</p>
                        <button onClick={handleBackup} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3"><Download size={20} />Download Backup (.json)</button>
                     </div>
                     <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
                        <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-600 mb-6"><CloudUpload size={32} /></div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">Pulihkan Data</h4>
                        <p className="text-slate-500 text-sm mb-8 flex-1">Unggah file cadangan untuk memulihkan data.</p>
                        <button onClick={() => restoreInputRef.current?.click()} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3"><RefreshCw size={20} />Pulihkan Data</button>
                        <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestore} />
                     </div>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Modal Form */}
        {showFormModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-3"><Plus size={20}/><h3 className="text-xl font-bold">{selectedSurat ? 'Edit Arsip' : 'Tambah Arsip Baru'}</h3></div>
                <button onClick={() => setShowFormModal(false)} className="p-2 hover:bg-white/10 rounded-xl"><X/></button>
              </div>
              <form onSubmit={handleFormSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Perihal / Judul Surat</label>
                    <input required className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nomor Surat</label>
                    <input required className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.noSurat} onChange={e => setFormData({...formData, noSurat: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Instansi Terkait</label>
                    <input required className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.pihak} onChange={e => setFormData({...formData, pihak: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Kategori</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value as KategoriSurat})}>
                      <option value="Masuk">Surat Masuk</option>
                      <option value="Keluar">Surat Keluar</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Status Dokumen</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as StatusSurat})}>
                      <option value="Proses">Dalam Proses</option>
                      <option value="Selesai">Selesai / Diarsipkan</option>
                      <option value="Penting">Segera / Penting</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tanggal Surat</label>
                    <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.tanggalSurat} onChange={e => setFormData({...formData, tanggalSurat: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tanggal Terima</label>
                    <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.tanggalTerima} onChange={e => setFormData({...formData, tanggalTerima: e.target.value})} />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Lampiran Digital (Maks 10MB)</label>
                    {!formData.fileData ? (
                       <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all group">
                         <Upload className="text-slate-300 mb-2 group-hover:text-blue-500 transition-colors" />
                         <p className="text-sm font-bold text-slate-400">Klik untuk pilih file (PDF/JPG/PNG)</p>
                         <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                       </div>
                    ) : (
                       <div className="p-4 bg-blue-50 rounded-2xl flex items-center justify-between border border-blue-100">
                         <div className="flex items-center gap-3">
                           <FileIcon size={20} className="text-blue-500" />
                           <span className="text-sm font-bold text-blue-900 truncate max-w-[400px]">{formData.fileName}</span>
                         </div>
                         <button type="button" onClick={() => setFormData({...formData, fileData: '', fileName: ''})} className="text-rose-500 hover:bg-white p-1.5 rounded-lg transition-all"><X size={18}/></button>
                       </div>
                    )}
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-[1.5rem] font-bold shadow-xl hover:bg-blue-900 transition-all">Simpan Arsip</button>
                  <button type="button" onClick={() => setShowFormModal(false)} className="px-8 bg-slate-100 text-slate-600 rounded-[1.5rem] font-bold hover:bg-slate-200 transition-all">Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Detail */}
        {showDetailModal && selectedSurat && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl p-10 overflow-hidden flex flex-col max-h-[95vh]">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Detail Arsip Digital</h3>
                <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-xl transition-all"><X/></button>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-8 overflow-y-auto">
                {/* Information Column */}
                <div className="w-full lg:w-1/3 space-y-6">
                  <DetailItem label="Perihal" value={selectedSurat.perihal} full/>
                  <div className="grid grid-cols-1 gap-4">
                    <DetailItem label="Nomor Surat" value={selectedSurat.noSurat}/>
                    <DetailItem label="Instansi / Pihak" value={selectedSurat.pihak}/>
                    <DetailItem label="Tanggal Surat" value={selectedSurat.tanggalSurat}/>
                    <DetailItem label="Tanggal Terima" value={selectedSurat.tanggalTerima}/>
                    <DetailItem label="Status Dokumen" value={selectedSurat.status} isStatus/>
                    <DetailItem label="Kategori" value={selectedSurat.kategori}/>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-black uppercase text-blue-400 mb-1 flex items-center gap-2"><Bot size={12}/> Ringkasan AI</p>
                    <p className="text-sm font-medium text-blue-900 leading-relaxed italic">"{selectedSurat.isiRingkas || 'Sedang memproses ringkasan...'}"</p>
                  </div>

                  {selectedSurat.fileData && (
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedSurat.fileData!;
                        link.download = selectedSurat.fileName || 'dokumen_arsip';
                        link.click();
                      }} 
                      className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:-translate-y-1 transition-all"
                    >
                      <Download size={20}/> Download Dokumen
                    </button>
                  )}
                </div>

                {/* Preview Column */}
                <div className="w-full lg:w-2/3 flex flex-col">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-1">Pratinjau Dokumen</p>
                  <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] overflow-hidden flex-1 min-h-[400px] flex items-center justify-center relative">
                    {selectedSurat.fileData ? (
                      selectedSurat.fileType?.startsWith('image/') ? (
                        <img 
                          src={selectedSurat.fileData} 
                          alt="Document Preview" 
                          className="w-full h-full object-contain animate-in fade-in duration-500" 
                        />
                      ) : selectedSurat.fileType === 'application/pdf' ? (
                        <iframe 
                          src={`${selectedSurat.fileData}#toolbar=0`} 
                          className="w-full h-full border-none"
                          title="PDF Viewer"
                        />
                      ) : (
                        <div className="text-center p-10">
                          <FileIcon size={48} className="text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500 font-bold text-sm">Pratinjau tidak tersedia untuk format ini</p>
                          <p className="text-slate-400 text-xs mt-1">Silakan unduh dokumen untuk melihat isi</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center p-10">
                        <Activity size={48} className="text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold text-sm italic">Belum ada file dokumen yang diunggah</p>
                      </div>
                    )}
                    
                    {selectedSurat.fileData && (
                       <button 
                        onClick={() => {
                          const win = window.open();
                          win?.document.write(`<iframe src="${selectedSurat.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                        }}
                        className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-all group"
                        title="Buka di Tab Baru"
                       >
                         <ExternalLink size={18} />
                       </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-50 shrink-0">
                <button onClick={() => setShowDetailModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all">Tutup Pratinjau</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Print Preview */}
        {showPrintPreview && (
           <div className="fixed inset-0 z-[200] bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-5xl h-[95vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                 <div className="p-6 bg-[#0F172A] text-white flex justify-between items-center no-print">
                    <div className="flex items-center gap-4"><Printer className="text-yellow-500" size={24}/><h3 className="text-xl font-bold">Cetak Laporan: {reportType}</h3></div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => window.print()} className="bg-yellow-500 text-slate-900 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-yellow-400">
                        <Printer size={18} /><span>Cetak Sekarang</span>
                      </button>
                      <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-all"><X size={20}/></button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-12 bg-slate-100 flex justify-center">
                    <div className="bg-white w-[210mm] min-h-[297mm] p-16 flex flex-col text-black shadow-lg">
                       <div className="flex items-center gap-6 border-b-[3px] border-black pb-4 mb-8">
                          <div className="w-20 h-20 bg-slate-200 border-2 border-black flex items-center justify-center text-[8px] font-bold text-center p-2">LOGO PROV NTB</div>
                          <div className="text-center flex-1">
                             <h4 className="text-lg font-bold uppercase leading-tight">Pemerintah Provinsi Nusa Tenggara Barat</h4>
                             <h4 className="text-xl font-black uppercase">Biro Pengadaan Barang dan Jasa</h4>
                             <p className="text-sm font-bold">Layanan Pengadaan Secara Elektronik (LPSE)</p>
                          </div>
                          <div className="w-20 h-20 border-2 border-black flex items-center justify-center"><QrCode size={50}/></div>
                       </div>
                       <h5 className="text-center font-black text-lg underline mb-8 uppercase">LAPORAN ARSIP DIGITAL {reportType !== 'Semua' ? `SURAT ${reportType.toUpperCase()}` : 'SEMUA SURAT'}</h5>
                       <table className="w-full border-collapse border-2 border-black text-[10px]">
                          <thead className="bg-slate-100 font-black uppercase">
                             <tr>
                                <th className="border-2 border-black p-2 text-center w-8">No</th>
                                <th className="border-2 border-black p-2 text-center">Nomor Surat</th>
                                <th className="border-2 border-black p-2 text-center">Tanggal</th>
                                <th className="border-2 border-black p-2 text-left">Perihal</th>
                                <th className="border-2 border-black p-2 text-left">Instansi</th>
                             </tr>
                          </thead>
                          <tbody>
                             {(reportType === 'Semua' ? suratList : suratList.filter(s => s.kategori === reportType)).map((s, idx) => (
                                <tr key={s.id}>
                                   <td className="border-2 border-black p-2 text-center">{idx + 1}</td>
                                   <td className="border-2 border-black p-2 text-center font-bold">{s.noSurat}</td>
                                   <td className="border-2 border-black p-2 text-center">{s.tanggalSurat}</td>
                                   <td className="border-2 border-black p-2 font-semibold">{s.perihal}</td>
                                   <td className="border-2 border-black p-2">{s.pihak}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                       <div className="mt-12 flex justify-end text-center">
                          <div className="w-64">
                             <p className="text-xs font-bold mb-1">Mataram, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                             <p className="text-xs font-bold uppercase mb-16">Kepala LPSE Prov. NTB</p>
                             <p className="text-xs font-black uppercase underline">LALU MAJEMUK, S.Sos.</p>
                             <p className="text-[10px] font-bold">NIP. 19800101 200501 1 001</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

// --- Sub-Components ---
const SidebarLink: React.FC<{ icon: React.ReactNode, label: string, active: boolean, collapsed: boolean, onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-yellow-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    <div className="shrink-0">{React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}</div>
    {!collapsed && <span className="text-sm font-bold tracking-tight">{label}</span>}
  </button>
);

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string, bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
    <div className={`${bg} ${color} p-4 rounded-2xl`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}</div>
    <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p><h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4></div>
  </div>
);

const StatusBadge: React.FC<{ status: StatusSurat }> = ({ status }) => {
  const styles = { 
    'Selesai': 'bg-emerald-50 text-emerald-700 border-emerald-100', 
    'Penting': 'bg-rose-50 text-rose-700 border-rose-100', 
    'Proses': 'bg-amber-50 text-amber-700 border-amber-100' 
  };
  return <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>{status}</span>;
};

const DetailItem: React.FC<{ label: string, value: string, full?: boolean, isStatus?: boolean }> = ({ label, value, full, isStatus }) => (
  <div className={full ? 'col-span-2' : ''}>
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
    {isStatus ? <StatusBadge status={value as StatusSurat}/> : <p className="font-bold text-slate-800 leading-tight">{value}</p>}
  </div>
);

export default App;
