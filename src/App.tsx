import React, { useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  MapPin,
  Instagram,
  ArrowRight,
  LogOut,
  Settings,
  AlertCircle,
  Trash2,
  XCircle,
  CalendarDays,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ShieldOff,
  UserX,
  Flag,
  Info,
  Image,
  Coffee,
  Search
} from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, where, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, auth, signInWithGoogle, logout } from './lib/firebase';
import { Service, Appointment, DayOff, UserStatus, Professional, PortfolioItem, TimeBlock } from './types';
import { SERVICES, TIME_SLOTS, PROFESSIONALS } from './constants';

const ADMIN_EMAILS = ["bruno.c.reis.ds@gmail.com", "vazbarrosestela@gmail.com"];
const OWNER_PHONE = "5511983498971"; // Número oficial da Vzz Nails

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  isLoading = false 
}: { 
  children: ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'; 
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
}) => {
  const baseStyles = "px-6 py-3 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm uppercase tracking-wider relative overflow-hidden group";
  const variants = {
    primary: `bg-primary text-white hover:shadow-xl hover:shadow-primary/30 disabled:bg-neutral-300 active:scale-95`,
    secondary: `bg-secondary text-primary hover:bg-opacity-80 active:scale-95`,
    outline: `border-2 border-primary text-primary hover:bg-primary hover:text-white active:scale-95`,
    ghost: `text-neutral-500 hover:text-primary hover:bg-primary/5 active:scale-95`
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      <motion.div 
        className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant"
        style={{ transform: 'skewX(-20deg)' }}
      />
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
};

const CustomCalendar = ({ selectedDate, onSelect, daysOff = [] }: { selectedDate: string, onSelect: (date: string) => void, daysOff?: string[] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const monthYear = currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const days = Array.from({ length: daysInMonth(currentMonth.getMonth(), currentMonth.getFullYear()) }, (_, i) => i + 1);
  const offset = Array.from({ length: firstDayOfMonth(currentMonth.getMonth(), currentMonth.getFullYear()) });

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
  };

  const isPast = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isSelected = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return dateStr === selectedDate;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg text-primary capitalize">{monthYear}</h3>
        <div className="flex gap-1">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-neutral-50 rounded-full transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-neutral-50 rounded-full transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
          <div key={`${day}-${index}`} className="text-center text-[10px] font-bold text-neutral-300 py-2">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {offset.map((_, i) => <div key={`offset-${i}`} />)}
        {days.map(day => {
          const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const isOff = daysOff.includes(dateStr);
          const disabled = isPast(day) || isOff;
          const active = isSelected(day);
          
          return (
            <button
              key={day}
              onClick={() => !disabled && onSelect(dateStr)}
              className={`aspect-square flex items-center justify-center rounded-xl text-sm relative transition-all ${
                active 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110 z-10' 
                  : disabled 
                    ? 'text-neutral-200 cursor-not-allowed opacity-50' 
                    : 'text-neutral-600 hover:bg-neutral-50 active:bg-primary/10'
              } ${isToday(day) && !active ? 'border border-primary/40 font-bold text-primary ring-2 ring-primary/5' : ''}`}
            >
              {day}
              {isOff && !active && <div className="absolute bottom-1 w-1 h-1 bg-red-400 rounded-full" />}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

const ProfessionalSection = ({ 
  professionals, 
  selectedProfessional, 
  onSelect 
}: { 
  professionals: Professional[]; 
  selectedProfessional: Professional | null; 
  onSelect: (p: Professional) => void;
  key?: React.Key;
}) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4"
    >
      {professionals.map(p => (
        <motion.div
          key={p.id}
          variants={item}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(p)}
          className={`p-6 rounded-[32px] cursor-pointer transition-all border-2 flex items-center gap-5 group relative overflow-hidden ${
            selectedProfessional?.id === p.id 
              ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10' 
              : 'border-transparent bg-white hover:border-primary/10 shadow-sm'
          }`}
        >
          {selectedProfessional?.id === p.id && (
            <motion.div 
              layoutId="profSelectionBg"
              className="absolute inset-0 bg-primary/5 opacity-50 pointer-events-none"
            />
          )}
          <div className="relative">
            <div className={`absolute inset-0 rounded-2xl bg-primary/20 blur-md transition-opacity duration-300 ${selectedProfessional?.id === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
            <img src={p.avatar} alt={p.name} className="w-16 h-16 rounded-2xl object-cover relative z-10 shadow-sm" />
            {selectedProfessional?.id === p.id && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full shadow-lg z-20"
              >
                <CheckCircle2 size={14} />
              </motion.div>
            )}
          </div>
          <div className="flex-1 relative z-10">
            <h4 className="font-bold text-neutral-800 text-lg leading-tight group-hover:text-primary transition-colors">{p.name}</h4>
            <p className="text-secondary-foreground/60 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">{p.role}</p>
          </div>
          <motion.div
            animate={{ 
              x: selectedProfessional?.id === p.id ? 0 : -10,
              opacity: selectedProfessional?.id === p.id ? 1 : 0
            }}
            className="text-primary relative z-10"
          >
            <ArrowRight size={20} />
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
};

const ServiceSection = ({ 
  category, 
  services, 
  professional, 
  selectedService, 
  onSelect 
}: { 
  category: string; 
  services: Service[]; 
  professional: Professional;
  selectedService: { id: string, name: string, price: number } | null; 
  onSelect: (s: { id: string, name: string, price: number } | null) => void;
  key?: React.Key;
}) => {
  const availableServices = services.filter(s => 
    professional.services.some(ps => ps.serviceId === s.id)
  );

  if (availableServices.length === 0) return null;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="space-y-4">
      <motion.h3 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-bold ml-2 border-l-2 border-primary/20 pl-3 py-1"
      >
        {category}
      </motion.h3>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-3"
      >
        {availableServices.map(s => {
          const price = professional.services.find(ps => ps.serviceId === s.id)?.price || 0;
          const isSelected = selectedService?.id === s.id;

          return (
            <motion.div
              key={s.id}
              variants={item}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect({ id: s.id, name: s.name, price })}
              className={`p-5 rounded-[28px] cursor-pointer transition-all border-2 flex justify-between items-center group relative overflow-hidden ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' 
                  : 'border-transparent bg-white hover:border-primary/10 shadow-sm'
              }`}
            >
              {isSelected && (
                <motion.div 
                  layoutId={`serviceHighlight-${category}`}
                  className="absolute inset-0 bg-primary/5 pointer-events-none"
                />
              )}
              <div className="flex-1 relative z-10">
                <p className={`font-medium tracking-tight transition-colors ${isSelected ? 'text-primary' : 'text-neutral-600'}`}>{s.name}</p>
                <p className="text-xl font-serif text-neutral-800">R$ {price.toFixed(2)}</p>
              </div>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all relative z-10 ${
                isSelected ? 'border-primary bg-primary text-white scale-110 shadow-md' : 'border-neutral-100 group-hover:border-primary/30'
              }`}>
                {isSelected ? <CheckCircle2 size={16} /> : <div className="w-2 h-2 rounded-full bg-neutral-100 group-hover:bg-primary/20 transition-colors" />}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

// --- Main App ---

  export default function App() {
  type Step = 'home' | 'professional' | 'service' | 'datetime' | 'form' | 'payment' | 'success' | 'admin' | 'my-appointments' | 'gallery';
  const [step, setStep] = useState<Step>('home');
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedService, setSelectedService] = useState<{ id: string, name: string, price: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [adminTab, setAdminTab] = useState<'agenda' | 'folgas' | 'usuarios' | 'equipe' | 'galeria' | 'bloqueios'>('agenda');
  const [adminDateFilter, setAdminDateFilter] = useState<string>('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminProfessionalFilter, setAdminProfessionalFilter] = useState<string>('all');
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});
  const [currentUserStatus, setCurrentUserStatus] = useState<UserStatus | null>(null);
  const [showBlockedUI, setShowBlockedUI] = useState(false);
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const [liveProfessionals, setLiveProfessionals] = useState<Professional[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
  const [hasShownReminder, setHasShownReminder] = useState(false);
  const [showBookingReminder, setShowBookingReminder] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- States for dynamic categories in admin ---
  const [newServiceCategory, setNewServiceCategory] = useState<string>('Aplicação');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // --- Admin Gallery & Blocks States ---
  const [newPortfolioUrl, setNewPortfolioUrl] = useState('');
  const [newPortfolioDesc, setNewPortfolioDesc] = useState('');
  const [newBlockProfessional, setNewBlockProfessional] = useState('');
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockTime, setNewBlockTime] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('Almoço');

  const availableCategories = useMemo(() => {
    const cats = new Set(liveServices.map(s => s.category));
    return Array.from(cats);
  }, [liveServices]);

  useEffect(() => {
    if (!user) {
      setUserAppointments([]);
      return;
    }
    const q = query(
      collection(db, 'appointments'),
      where('customerId', '==', user.uid),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const unsub = onSnapshot(q, (snap) => {
      const apps = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
      // Filter only future or today's appointments
      const today = new Date().toISOString().split('T')[0];
      const futureApps = apps.filter(a => a.date >= today);
      setUserAppointments(futureApps);
    });
    return unsub;
  }, [user]);

  const startBooking = () => {
    setSelectedProfessional(null);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTime('');
    setHasShownReminder(false);
    setCurrentAppointmentId(null);
    setStep('professional');
  };

  useEffect(() => {
    // Show reminder if user has future appointments and just started booking
    if (step === 'service' && userAppointments.length > 0 && !hasShownReminder) {
      setShowBookingReminder(true);
      setHasShownReminder(true);
    }
  }, [step, userAppointments, hasShownReminder]);

  useEffect(() => {
    // Seed data if empty (for admin)
    const seedData = async () => {
      if (isAdmin) {
        try {
          const { getDocs } = await import('firebase/firestore');
          // Services
          const servicesSnap = await getDocs(collection(db, 'services'));
          if (servicesSnap.empty) {
            for (const s of SERVICES) {
              await setDoc(doc(db, 'services', s.id), s);
            }
          }
          // Professionals
          const profsSnap = await getDocs(collection(db, 'professionals'));
          if (profsSnap.empty) {
            for (const p of PROFESSIONALS) {
              await setDoc(doc(db, 'professionals', p.id), p);
            }
          }
        } catch (e) {
          console.error("Erro ao semear dados:", e);
        }
      }
    };
    seedData();
  }, [isAdmin]);

  useEffect(() => {
    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      setLiveServices(snap.docs.map(d => ({ ...d.data() } as Service)));
    });
    const unsubProfs = onSnapshot(collection(db, 'professionals'), (snap) => {
      setLiveProfessionals(snap.docs.map(d => ({ ...d.data() } as Professional)));
    });
    const unsubPortfolio = onSnapshot(query(collection(db, 'portfolio'), orderBy('createdAt', 'desc')), (snap) => {
      setPortfolio(snap.docs.map(d => ({ id: d.id, ...d.data() } as PortfolioItem)));
    });
    const unsubTimeBlocks = onSnapshot(collection(db, 'time_blocks'), (snap) => {
      setTimeBlocks(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeBlock)));
    });
    return () => {
      unsubServices();
      unsubProfs();
      unsubPortfolio();
      unsubTimeBlocks();
    };
  }, []);

  const scrollDates = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  useEffect(() => {
    // Reset selection state when date changes to avoid bug
    setSelectedTime(''); 
    setBusySlots([]);

    if (selectedDate && selectedProfessional) {
      const q = query(
        collection(db, 'appointments'), 
        where('date', '==', selectedDate)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const slots = snapshot.docs
          .map(doc => doc.data() as Appointment)
          .filter(app => app.professionalId === selectedProfessional.id && ['pending', 'confirmed'].includes(app.status))
          .map(app => app.time);
          
        const blockedSlots = timeBlocks
          .filter(tb => tb.professionalId === selectedProfessional.id && tb.date === selectedDate)
          .map(tb => tb.time);

        setBusySlots([...slots, ...blockedSlots]);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'appointments');
      });
      return () => unsub();
    }
  }, [selectedDate, selectedProfessional, timeBlocks]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email ? ADMIN_EMAILS.includes(u.email) : false);
      if (u) {
        setCustomerInfo(prev => ({ ...prev, name: u.displayName || '' }));
      }
      setIsAuthLoading(false);
      // If user logs out while in admin panel or user panel, go home
      if (!u && (step === 'admin' || step === 'my-appointments')) setStep('home');
    });
    return () => unsubscribe();
  }, [step]);

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, 'user_status', user.uid), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserStatus;
          setCurrentUserStatus(data);
          // Auto-fill customer info if empty
          setCustomerInfo(prev => ({
            ...prev,
            name: prev.name || data.lastUsedName || user.displayName || '',
            phone: prev.phone || data.lastUsedPhone || ''
          }));
          if (data.isBlocked) setShowBlockedUI(true);
        } else {
          setCurrentUserStatus(null);
        }
      });
      return () => unsub();
    } else {
      setCurrentUserStatus(null);
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin && step === 'admin') {
      const unsub = onSnapshot(collection(db, 'user_status'), (snapshot) => {
        const statuses: Record<string, UserStatus> = {};
        snapshot.docs.forEach(d => {
          statuses[d.id] = { id: d.id, ...d.data() } as UserStatus;
        });
        setUserStatuses(statuses);
      });
      return () => unsub();
    }
  }, [isAdmin, step]);

  const handleUpdateUserStatus = async (userId: string, action: 'block' | 'flag' | 'clear') => {
    try {
      const statusRef = doc(db, 'user_status', userId);
      const current = userStatuses[userId] || { isBlocked: false, isFlagged: false };
      
      let update: Partial<UserStatus> = { 
        updatedAt: new Date().toISOString(),
        email: userStatuses[userId]?.email || (appointments.find(a => a.customerId === userId)?.customerId === userId ? appointments.find(a => a.customerId === userId)?.customerId : undefined)
      };
      
      if (action === 'block') update = { ...update, isBlocked: !current.isBlocked };
      if (action === 'flag') update = { ...update, isFlagged: !current.isFlagged };
      if (action === 'clear') update = { isBlocked: false, isFlagged: false, adminNotes: '', updatedAt: new Date().toISOString() };
      
      await setDoc(statusRef, update, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `user_status/${userId}`);
    }
  };

  useEffect(() => {
    if (user && step === 'my-appointments') {
      const q = query(collection(db, 'appointments'), where('customerId', '==', user.uid));
      const unsub = onSnapshot(q, (snapshot) => {
        setMyAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      });
      return () => unsub();
    }
  }, [user, step]);

  useEffect(() => {
    if (isAdmin && step === 'admin') {
      const q = query(collection(db, 'appointments'), orderBy('date', 'asc'), orderBy('time', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        setAppointments(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'appointments');
      });
      return () => unsubscribe();
    }
  }, [isAdmin, step]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'days_off'), (snapshot) => {
      setDaysOff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DayOff)));
    });
    return () => unsub();
  }, []);

  const handleBooking = async () => {
    console.log("handleBooking called", { selectedService, selectedDate, selectedTime, customerInfo, user });
    if (!selectedService || !selectedDate || !selectedTime || !customerInfo.name || !customerInfo.phone || !user) {
      console.log("Missing fields in booking");
      return;
    }
    
    if (currentUserStatus?.isBlocked) {
      console.log("User is blocked");
      alert("Sua conta está restrita para novos agendamentos. Por favor, entre em contato com a profissional.");
      return;
    }

    setIsSubmitting(true);
    const appointment: Omit<Appointment, 'id'> = {
      customerId: user.uid,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      professionalId: selectedProfessional!.id,
      professionalName: selectedProfessional!.name,
      serviceId: selectedService!.id,
      serviceName: selectedService!.name,
      price: selectedService!.price,
      date: selectedDate,
      time: selectedTime,
      status: 'pending',
      description: customerInfo.description,
      createdAt: new Date().toISOString()
    };

    try {
      console.log("Preparing to add appointment");
      const docRef = await addDoc(collection(db, 'appointments'), {
        ...appointment,
        paymentStatus: 'pending'
      });
      console.log("Appointment added, ID:", docRef.id);
      setCurrentAppointmentId(docRef.id);
      
      // Update persistent user profile/status
      if (user) {
        await setDoc(doc(db, 'user_status', user.uid), {
          lastUsedName: customerInfo.name,
          lastUsedPhone: customerInfo.phone,
          email: user.email,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setStep('payment');
    } catch (error) {
      console.error("Error in handleBooking:", error);
      handleFirestoreError(error, OperationType.WRITE, 'appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!currentAppointmentId) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'appointments', currentAppointmentId), {
        paymentStatus: 'paid'
      });
      
      // WhatsApp redirect after payment confirmation
      const dateFormatted = selectedDate.split('-').reverse().join('/');
      const zapMessage = encodeURIComponent(`Olá! Acabei de realizar o pagamento do meu agendamento de ${selectedService?.name} para o dia ${dateFormatted} às ${selectedTime}. Segue o comprovante:`);
      window.open(`https://wa.me/${OWNER_PHONE}?text=${zapMessage}`, '_blank');
      
      setStep('waiting_payment');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'appointments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = useMemo(() => {
    if (!selectedProfessional) return {};
    const groups: Record<string, Service[]> = {};
    const effectiveServices = liveServices.length > 0 ? liveServices : SERVICES;
    effectiveServices.forEach(s => {
      if (selectedProfessional.services.some(ps => ps.serviceId === s.id)) {
        if (!groups[s.category]) groups[s.category] = [];
        groups[s.category].push(s);
      }
    });
    return groups;
  }, [selectedProfessional, liveServices]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login falhou:", error);
    }
  };

  const handleUpdateProfessionalService = async (profId: string, serviceId: string, price: number) => {
    try {
      const prof = liveProfessionals.find(p => p.id === profId);
      if (!prof) return;
      const updatedServices = prof.services.map(s => s.serviceId === serviceId ? { ...s, price } : s);
      await updateDoc(doc(db, 'professionals', profId), { services: updatedServices });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'professionals');
    }
  };

  const handleAddServiceToProfessional = async (profId: string, serviceId: string, price: number) => {
    try {
      const prof = liveProfessionals.find(p => p.id === profId);
      if (!prof) return;
      if (prof.services.some(s => s.serviceId === serviceId)) return;
      const updatedServices = [...prof.services, { serviceId, price }];
      await updateDoc(doc(db, 'professionals', profId), { services: updatedServices });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'professionals');
    }
  };

  const handleRemoveServiceFromProfessional = async (profId: string, serviceId: string) => {
    try {
      const prof = liveProfessionals.find(p => p.id === profId);
      if (!prof) return;
      const updatedServices = prof.services.filter(s => s.serviceId !== serviceId);
      await updateDoc(doc(db, 'professionals', profId), { services: updatedServices });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'professionals');
    }
  };

  const handleCreateGlobalService = async () => {
    const category = isNewCategory ? customCategory.trim() : newServiceCategory;
    if (!newServiceName.trim() || !category) return;
    try {
      const id = newServiceName.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      await setDoc(doc(db, 'services', id), {
        id,
        name: newServiceName,
        category: category
      });
      setNewServiceName('');
      setCustomCategory('');
      setIsNewCategory(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'services');
    }
  };

  const handleAddPortfolio = async (imageUrl: string, description: string) => {
    try {
      await addDoc(collection(db, 'portfolio'), {
        imageUrl,
        description,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'portfolio');
    }
  };

  const handleAddTimeBlock = async (professionalId: string, date: string, time: string, reason: string) => {
    try {
      const id = `${professionalId}-${date}-${time.replace(':', '')}`;
      await setDoc(doc(db, 'time_blocks', id), {
        professionalId,
        date,
        time,
        reason
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'time_blocks');
    }
  };

  const nextStep = () => {
    if (step === 'home') setStep('professional');
    else if (step === 'professional' && selectedProfessional) setStep('service');
    else if (step === 'service' && selectedService) setStep('datetime');
    else if (step === 'datetime' && selectedDate && selectedTime) setStep('form');
  };

  const prevStep = () => {
    if (step === 'professional') setStep('home');
    else if (step === 'service') {
      setSelectedProfessional(null);
      setStep('professional');
    }
    else if (step === 'datetime') setStep('service');
    else if (step === 'form') setStep('datetime');
    else if (step === 'payment') setStep('form');
  };

  const handleVerifyPayment = async (appointmentId: string) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        paymentStatus: 'verified',
        status: 'confirmed'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'appointments');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'appointments');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este agendamento?")) return;
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'appointments');
    }
  };

  const handleToggleDayOff = async (selectedDayOffDate: string) => {
    const existing = daysOff.find(d => d.date === selectedDayOffDate);
    try {
      if (existing) {
        await deleteDoc(doc(db, 'days_off', existing.id!));
      } else {
        const id = selectedDayOffDate.replace(/-/g, '');
        await setDoc(doc(db, 'days_off', id), { date: selectedDayOffDate });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'days_off');
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto relative overflow-hidden flex flex-col bg-[#FAF9F6] shadow-2xl shadow-primary/5 min-w-[320px]">
      <AnimatePresence>
        {showBlockedUI && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 max-w-xs w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif text-neutral-800">Conta Restrita</h3>
                <p className="text-[11px] text-neutral-500 leading-relaxed font-bold uppercase tracking-wider">
                  Agendamentos Temporariamente Desativados
                </p>
                <p className="text-sm text-neutral-400">
                  Para solicitar o desbloqueio da sua conta, por favor envie uma mensagem diretmente para a profissional.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <a 
                  href={`https://wa.me/${OWNER_PHONE}?text=Olá,%20minha%20conta%20está%20restrita%20no%20sistema%20de%20agendamentos%20e%20gostaria%20de%20solicitar%20o%20desbloqueio.`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Phone size={18} /> Chamar no WhatsApp
                </a>
                <button 
                  onClick={() => setShowBlockedUI(false)}
                  className="w-full py-2 text-neutral-300 font-bold text-[10px] uppercase tracking-widest hover:text-neutral-500 transition-colors"
                >
                  Fechar Aviso
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decorative Elements - Expanded for larger container */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-80 h-80 bg-primary/3 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Cabeçalho */}
      <header className="p-8 pt-12 text-center z-10 transition-all duration-500">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-block mb-4"
        >
          <motion.div 
            animate={{ 
              y: [0, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-primary/5 mx-auto overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 group-hover:opacity-50 transition-opacity" />
            <span className="text-primary text-4xl font-serif tracking-tighter relative z-10">Vzz</span>
          </motion.div>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl text-primary mb-1 font-serif"
        >
          Vzz Nails
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 font-bold opacity-60"
        >
          Nail Artistry & Care
        </motion.p>

        {/* Step Indicator */}
        {['professional', 'service', 'datetime', 'form', 'payment'].includes(step) && (
          <div className="mt-8 flex justify-center gap-2">
            {['professional', 'service', 'datetime', 'form', 'payment'].map((s, index) => {
              const steps = ['professional', 'service', 'datetime', 'form', 'payment'];
              const currentIdx = steps.indexOf(step as any);
              const isActive = index <= currentIdx;
              return (
                <div 
                  key={s} 
                  className={`h-1 rounded-full transition-all duration-500 ${isActive ? 'w-8 bg-primary' : 'w-4 bg-neutral-100'}`} 
                />
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 px-6 pb-20 z-10">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center pt-10 space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-2xl text-primary font-serif">Bem-vinda de volta!</h2>
                <p className="text-neutral-500 px-8 font-light leading-relaxed">
                  Para iniciarmos seu agendamento, por favor faça login abaixo.
                </p>
              </div>
              <Button onClick={handleLogin} className="w-full h-16 shadow-xl shadow-primary/10">
                Entrar com Google
              </Button>
            </motion.div>
          ) : step === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center pt-6 space-y-10"
            >
              <div className="w-full space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm">
                      <img src={user.photoURL || ''} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Olá, {user.displayName?.split(' ')[0]}!</p>
                      <button onClick={logout} className="text-[10px] text-primary underline font-medium">Sair</button>
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => setStep('admin')}
                      className="p-3 bg-neutral-900 text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      <Settings size={18} />
                    </button>
                  )}
                </div>


                <p className="text-lg leading-relaxed text-neutral-600 font-light px-4 text-center">
                  Pronta para brilhar? Agende seu momento na <span className="text-primary font-medium italic">Vzz Nails</span> e transforme seu visual.
                </p>
              </div>
              
              <div className="w-full space-y-4 px-2">
                <Button onClick={startBooking} className="w-full h-16 text-lg group shadow-xl">
                  Agendar Agora
                  <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={() => setStep('gallery')} className="h-14 bg-white border-neutral-100 text-xs text-primary font-bold shadow-sm">
                    <Image size={16} /> Ver Galeria
                  </Button>
                  <Button variant="outline" onClick={() => setStep('my-appointments')} className="h-14 bg-white border-neutral-100 text-xs text-neutral-500 font-bold shadow-sm">
                    <CalendarIcon size={16} /> Meus Horários
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Siga nossas redes</p>
                    <a href="https://instagram.com/vzznails" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm text-primary hover:scale-105 transition-transform">
                      <Instagram size={20} />
                    </a>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Entre em contato</p>
                    <a href={`https://wa.me/${OWNER_PHONE}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-secondary rounded-2xl border border-primary/10 shadow-sm text-primary hover:scale-105 transition-transform">
                      <Phone size={20} />
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-6">
                   <div className="h-px bg-neutral-200 flex-1" />
                   <MapPin size={14} className="text-primary" />
                   <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Brook Taylor, 471</span>
                   <div className="h-px bg-neutral-200 flex-1" />
                </div>
              </div>

              <div className="mt-12 flex justify-center w-full">
                <div className="flex items-start gap-4 text-left p-5 rounded-3xl bg-secondary/30 max-w-[300px] border border-primary/5">
                  <Sparkles className="text-primary shrink-0 opacity-40 mt-1" size={18} />
                  <p className="text-[11px] text-neutral-500 leading-relaxed italic">
                    "Transformamos cada detalhe em arte, refletindo sua personalidade com elegância e carinho."
                  </p>
                </div>
              </div>
            </motion.div>
          ) : step === 'gallery' ? (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pt-4"
            >
              <div className="flex items-center justify-between px-2 mb-2">
                <button 
                  onClick={() => setStep('home')}
                  className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-100 text-primary hover:scale-105 active:scale-95 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-2xl text-primary font-serif">Nossa Galeria</h2>
                <div className="w-11" />
              </div>

              {isAdmin && (
                <div className="bg-white p-6 rounded-[32px] border border-neutral-100 space-y-4 mx-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">
                    <Sparkles size={14} className="text-primary" /> Adicionar Fotos
                  </div>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="URL da Imagem (Link)"
                      value={newPortfolioUrl}
                      onChange={e => setNewPortfolioUrl(e.target.value)}
                      className="w-full bg-neutral-50 px-5 py-3 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white text-sm outline-none transition-all"
                    />
                    <textarea 
                      placeholder="Breve descrição (Opcional)"
                      value={newPortfolioDesc}
                      onChange={e => setNewPortfolioDesc(e.target.value)}
                      className="w-full bg-neutral-50 px-5 py-3 rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white text-sm outline-none resize-none h-16 transition-all"
                    />
                    <Button 
                      onClick={async () => {
                        if (!newPortfolioUrl) return;
                        await handleAddPortfolio(newPortfolioUrl, newPortfolioDesc);
                        setNewPortfolioUrl('');
                        setNewPortfolioDesc('');
                        alert('Foto adicionada com sucesso!');
                      }} 
                      className="w-full py-2.5"
                    >
                      Publicar Foto
                    </Button>
                  </div>
                </div>
              )}

                <div className="grid grid-cols-2 gap-4 pb-20 overflow-y-auto max-h-[60vh] px-1 pointer-events-auto">
                {portfolio.length > 0 ? (
                  <motion.div 
                    className="grid grid-cols-2 gap-4 col-span-2"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.1
                        }
                      }
                    }}
                  >
                    {portfolio.map(item => (
                      <motion.div 
                        key={item.id}
                        variants={{
                          hidden: { opacity: 0, scale: 0.9 },
                          show: { opacity: 1, scale: 1 }
                        }}
                        className="group relative aspect-square bg-white rounded-[32px] overflow-hidden border border-neutral-100 shadow-sm"
                        whileHover={{ scale: 1.02 }}
                      >
                        <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={item.description} />
                        {item.description && (
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end">
                            <p className="text-[10px] text-white font-medium line-clamp-2 leading-relaxed">{item.description}</p>
                          </div>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Excluir do portfólio?')) {
                                await deleteDoc(doc(db, 'portfolio', item.id));
                              }
                            }}
                            className="absolute top-3 right-3 p-2 bg-red-500/80 backdrop-blur-md text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="col-span-2 py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-300">
                      <Image size={32} />
                    </div>
                    <p className="text-neutral-400 font-light italic">Nenhuma foto postada ainda...</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : step === 'professional' ? (
            <motion.div
              key="professional"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={prevStep} className="p-2 hover:bg-white rounded-full transition-colors">
                  <ChevronLeft className="text-primary" />
                </button>
                <h2 className="text-2xl text-primary font-serif">Profissionais</h2>
              </div>
              <p className="text-neutral-500 text-sm font-light px-2 leading-relaxed">Escolha com quem você deseja agendar seu momento de cuidado.</p>

              <ProfessionalSection 
                professionals={liveProfessionals.length > 0 ? liveProfessionals : PROFESSIONALS}
                selectedProfessional={selectedProfessional}
                onSelect={(p) => {
                  setSelectedProfessional(p);
                  setSelectedService(null);
                  setStep('service');
                }}
              />
            </motion.div>
          ) : step === 'service' ? (
            <motion.div
              key="service"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={prevStep} className="p-2 hover:bg-white rounded-full transition-colors">
                  <ChevronLeft className="text-primary" />
                </button>
                <div>
                  <h2 className="text-2xl text-primary font-serif">Nossos Serviços</h2>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Sendo atendida por {selectedProfessional?.name}</p>
                </div>
              </div>

              <div className="space-y-12 pb-10">
                {(Object.entries(categories) as [string, Service[]][]).map(([category, services]) => (
                  <ServiceSection 
                    key={category}
                    category={category}
                    services={services}
                    professional={selectedProfessional!}
                    selectedService={selectedService}
                    onSelect={setSelectedService}
                  />
                ))}
              </div>

              <div className="pt-6 sticky bottom-4 bg-[#FAF9F6]/90 backdrop-blur-md -mx-6 px-6 pb-4">
                <Button 
                  onClick={nextStep} 
                  disabled={!selectedService} 
                  className="w-full h-15"
                >
                  Continuar
                </Button>
              </div>
            </motion.div>
          ) : step === 'datetime' ? (
            <motion.div
              key="datetime"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={prevStep} className="p-2 hover:bg-white rounded-full transition-colors">
                  <ChevronLeft className="text-primary" />
                </button>
                <h2 className="text-2xl text-primary font-serif">Escolha o Horário</h2>
              </div>

              <section className="space-y-4">
                <CustomCalendar 
                  selectedDate={selectedDate} 
                  onSelect={setSelectedDate} 
                  daysOff={daysOff.map(d => d.date)} 
                />
              </section>

              <AnimatePresence>
                {selectedDate && (
                  <motion.section 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-5"
                  >
                    <label className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-bold ml-2">Horários Disponíveis</label>
                    <div className="grid grid-cols-3 gap-3">
                      {TIME_SLOTS.map(t => {
                        const isBusy = busySlots.includes(t);
                        
                        // Filter out past times for today
                        const isPastTime = (() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          if (selectedDate !== todayStr) return false;
                          
                          const [hours, minutes] = t.split(':').map(Number);
                          const slotTime = new Date();
                          slotTime.setHours(hours, minutes, 0, 0);
                          return slotTime < new Date();
                        })();

                        if (isPastTime) return null;

                        return (
                          <button
                            key={t}
                            disabled={isBusy}
                            onClick={() => setSelectedTime(t)}
                            className={`p-4 rounded-2xl text-sm font-medium transition-all ${
                              isBusy 
                                ? 'bg-neutral-50 text-neutral-200 border-neutral-100 cursor-not-allowed'
                                : selectedTime === t 
                                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                                  : 'bg-white text-neutral-600 border border-neutral-100 hover:border-primary/40'
                            }`}
                          >
                            {t}
                            {isBusy && <span className="block text-[8px] mt-1 opacity-50 uppercase">Ocupado</span>}
                          </button>
                        );
                      })}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              <div className="pt-4">
                <Button 
                  onClick={nextStep} 
                  disabled={!selectedDate || !selectedTime} 
                  className="w-full h-15"
                >
                  Confirmar Data
                </Button>
              </div>
            </motion.div>
          ) : step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={prevStep} className="p-2 hover:bg-white rounded-full transition-colors">
                  <ChevronLeft className="text-primary" />
                </button>
                <h2 className="text-2xl text-primary font-serif">Finalizar Reserva</h2>
              </div>

              <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10 flex gap-4 items-start shadow-sm shadow-primary/5">
                <AlertCircle className="text-primary shrink-0 mt-1" size={20} />
                <div className="text-sm">
                  <p className="font-bold text-primary mb-1 tracking-tight">Importante!</p>
                  <p className="text-neutral-600 leading-relaxed font-light">
                    Por favor, chegue com <strong className="text-primary font-semibold">10 minutos de antecedência</strong> para registrarmos sua chegada e aproveitarmos cada minuto do seu horário.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] space-y-6 shadow-sm border border-neutral-100">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Quem é você? *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Nome completo"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className={`w-full pl-12 p-4 rounded-2xl bg-neutral-50/50 border transition-all placeholder:text-neutral-300 outline-none ${!customerInfo.name && customerInfo.phone ? 'border-red-200 bg-red-50/20 shadow-sm shadow-red-100' : 'border-transparent focus:border-primary/20 focus:bg-white'}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">WhatsApp de Contato: *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
                    <input 
                      type="tel" 
                      placeholder="(11) 99999-9999"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className={`w-full pl-12 p-4 rounded-2xl bg-neutral-50/50 border transition-all placeholder:text-neutral-300 outline-none ${!customerInfo.phone && customerInfo.name ? 'border-red-200 bg-red-50/20 shadow-sm shadow-red-100' : 'border-transparent focus:border-primary/20 focus:bg-white'}`}
                    />
                  </div>
                </div>

                {!customerInfo.name || !customerInfo.phone ? (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] text-red-500 font-bold uppercase tracking-wider text-center pt-2"
                  >
                    Por favor, preencha os campos obrigatórios (*)
                  </motion.p>
                ) : null}

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Observações (Opcional):</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 text-primary/30 w-5 h-5" />
                    <textarea 
                      placeholder="Ex: Quero minhas unhas no formato ballerina e na cor vermelho fosco..."
                      value={customerInfo.description}
                      onChange={(e) => setCustomerInfo({...customerInfo, description: e.target.value})}
                      rows={3}
                      className="w-full pl-12 p-4 rounded-2xl bg-neutral-50/50 border border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all placeholder:text-neutral-300 resize-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/40 rounded-[32px] border border-white space-y-4 shadow-sm">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Resumo</span>
                  <span className="text-xs font-serif text-primary">{selectedDate.split('-').reverse().join('/')}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-5 rounded-[24px] border border-neutral-50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Sparkles className="text-primary" size={40} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-primary font-bold tracking-tight">{selectedService?.name}</p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Com {selectedProfessional?.name}</p>
                    <p className="text-xs text-neutral-500 font-medium">{selectedTime}</p>
                  </div>
                  <p className="text-2xl font-serif text-primary relative z-10">R$ {selectedService?.price.toFixed(2)}</p>
                </div>
              </div>

              <Button 
                onClick={handleBooking} 
                isLoading={isSubmitting}
                disabled={!customerInfo.name || !customerInfo.phone}
                className="w-full h-16 shadow-xl shadow-primary/20 disabled:opacity-50"
              >
                Prosseguir para Pagamento
                <ArrowRight size={20} />
              </Button>
            </motion.div>
          ) : step === 'payment' ? (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-10"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setStep('form')} className="p-2 hover:bg-white rounded-full transition-colors">
                  <ChevronLeft className="text-primary" />
                </button>
                <h2 className="text-2xl text-primary font-serif">Pagamento PIX</h2>
              </div>

              <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10 flex gap-4 items-start shadow-sm shadow-primary/5">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-primary/5 shrink-0">
                  <Info size={20} />
                </div>
                <div className="text-sm">
                  <p className="font-bold text-primary mb-1 tracking-tight uppercase text-[10px]">Atenção</p>
                  <p className="text-neutral-600 leading-relaxed font-light">
                    Sua reserva está <strong className="text-primary">pré-agendada</strong>. Para garantir seu horário na agenda, o pagamento deve ser realizado via PIX agora.
                  </p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[48px] shadow-2xl shadow-primary/5 border border-neutral-50 space-y-8 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Valor do Serviço</p>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-3xl font-serif text-primary">R$ {selectedService?.price.toFixed(2)}</p>
                    <p className="text-[10px] text-neutral-400 font-medium">{selectedService?.name} com {selectedProfessional?.name}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-center">
                    <div className="relative group">
                      <div className="absolute -inset-4 bg-primary/5 rounded-[40px] blur-2xl group-hover:bg-primary/10 transition-all" />
                      <div className="w-44 h-44 bg-white rounded-[32px] flex items-center justify-center border-4 border-neutral-50 shadow-inner relative z-10">
                        <div className="flex flex-col items-center gap-3 text-neutral-300">
                          <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020126330014br.gov.bcb.pix0111119834989715204000053039865802BR5915VZZ%20NAILS%20LTDA6009SAO%20PAULO62070503***6304" 
                            alt="QR Code PIX" 
                            className="w-36 h-36 opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Beneficiário</p>
                       <p className="text-xs font-bold text-neutral-800">Estela Vaz Barros (Vzz Nails)</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Chave PIX (Celular)</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText("11983498971");
                          alert('Chave PIX copiada com sucesso!');
                        }}
                        className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100 group hover:border-primary/30 transition-all hover:bg-white"
                      >
                        <span className="font-mono text-sm text-neutral-700 tracking-wider">11 98349-8971</span>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary px-3 py-1.5 bg-white rounded-xl shadow-sm border border-neutral-100 group-hover:bg-primary group-hover:text-white transition-all">
                          <Sparkles size={12} /> COPIAR
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <Button 
                  onClick={handleConfirmPayment} 
                  isLoading={isSubmitting}
                  className="w-full h-16 shadow-2xl shadow-primary/20"
                >
                  Já realizei o pagamento
                  <CheckCircle2 size={18} />
                </Button>
                <p className="text-[10px] text-center text-neutral-400 font-bold uppercase tracking-widest leading-loose max-w-[280px] mx-auto">
                  A profissional irá validar seu PIX e confirmar o agendamento em instantes.
                </p>
              </div>
            </motion.div>
          ) : step === 'waiting_payment' ? (
            <motion.div
              key="waiting_payment"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center pt-10 space-y-8"
            >
              <div className="w-32 h-32 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-2 shadow-inner ring-8 ring-amber-100/30">
                <Clock size={64} strokeWidth={1} />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-3xl text-primary font-serif">Aguardando Confirmação</h2>
                <div className="flex flex-col items-center gap-3">
                  <p className="text-neutral-600 px-6 font-light leading-relaxed">
                    Pagamento registrado! A profissional confirmará seu agendamento em breve.
                  </p>
                  <p className="text-neutral-500 px-6 font-bold text-[11px] uppercase tracking-wider">
                    Você poderá verificar o status no menu "Meu Horários".
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={() => setStep('home')} variant="outline">
                  Voltar para o início
                </Button>
              </div>
            </motion.div>
          ) : step === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center pt-10 space-y-8"
            >
              <div className="relative">
                <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-2 shadow-inner ring-8 ring-green-100/30">
                  <CheckCircle2 size={64} strokeWidth={1} />
                </div>
                <motion.div 
                  className="absolute -top-4 -right-4 text-primary opacity-20"
                  animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles size={56} />
                </motion.div>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-3xl text-primary font-serif">Agendamento Realizado!</h2>
                <div className="flex flex-col items-center gap-3">
                   <p className="text-neutral-600 px-6 font-light leading-relaxed">
                    Tudo certo, <strong>{customerInfo.name.split(' ')[0]}</strong>! Seu pedido de agendamento foi recebido.
                  </p>
                  <div className="px-4 py-1.5 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/10">
                    Aguardando Confirmação de Pagamento
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white rounded-[48px] border border-neutral-100 w-full space-y-8 shadow-2xl shadow-primary/5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-bold">Profissional</p>
                    <p className="text-lg text-primary font-medium">{selectedProfessional?.name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-bold">Data & Hora</p>
                    <p className="text-3xl text-primary font-serif">{selectedDate.split('-').reverse().join('/')}</p>
                    <p className="text-xl text-primary font-light">às {selectedTime}</p>
                  </div>
                </div>
                
                <div className="pt-8 border-t border-neutral-50 text-[11px] text-neutral-400 space-y-4 px-2 tracking-wide">
                  <div className="bg-primary/5 p-4 rounded-3xl space-y-2 border border-primary/10">
                    <p className="flex items-center gap-2 font-bold text-primary uppercase tracking-[0.1em] text-[8px]">
                       <MessageSquare size={12} strokeWidth={3} /> Aviso Importante
                    </p>
                    <p className="text-neutral-500 leading-relaxed font-medium">
                      Um dia antes do seu agendamento, entraremos em contato via WhatsApp para confirmar sua presença.
                    </p>
                  </div>
                  <p className="flex items-center gap-3 justify-center opacity-70 font-medium">
                    <MapPin size={14} className="text-primary/40" /> Rua Brook Taylor, 471
                  </p>
                </div>
              </div>
              
              <Button variant="secondary" onClick={() => setStep('home')} className="w-full h-15">
                Voltar para o Início
              </Button>
            </motion.div>
          ) : step === 'my-appointments' ? (
            <motion.div
              key="my-appointments"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setStep('home')} className="p-3 bg-white rounded-2xl text-neutral-400 hover:text-primary transition-colors shadow-sm">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-2xl text-primary font-serif">Meus Horários</h2>
              </div>

              {myAppointments.length === 0 ? (
                <div className="text-center py-20 bg-white/40 rounded-[40px] border border-dashed border-neutral-200">
                  <CalendarIcon size={48} className="mx-auto text-neutral-200 mb-4" />
                  <p className="text-neutral-500 font-light px-12">Você ainda não tem agendamentos marcados.</p>
                  <Button variant="ghost" onClick={startBooking} className="mt-4 text-primary">Marcar agora</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myAppointments.map(app => {
                    const prof = liveProfessionals.find(p => p.id === app.professionalId);
                    return (
                      <div key={app.id} className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-neutral-800">{app.serviceName}</h4>
                            <p className="text-xs text-neutral-400">R$ {app.price.toFixed(2)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                              app.status === 'confirmed' ? 'bg-green-50 text-green-600' : 
                              app.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                            }`}>
                              {app.status === 'pending' ? 'Pendente' : app.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                            </div>
                            {app.status !== 'cancelled' && (
                              <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                                app.paymentStatus === 'paid' ? 'bg-blue-50 text-blue-600' : 
                                app.paymentStatus === 'verified' ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-400'
                              }`}>
                                {app.paymentStatus === 'paid' ? 'Pagamento Realizado' : app.paymentStatus === 'verified' ? 'Pagamento Verificado' : 'Aguardando Pagamento'}
                              </div>
                            )}
                            {app.status !== 'cancelled' && (
                              <a 
                                href={`https://wa.me/${OWNER_PHONE}?text=Olá,%20gostaria%20de%20desmarcar%20meu%20agendamento%20de%20${app.serviceName}%20no%20dia%20${app.date.split('-').reverse().join('/')}%20às%20${app.time}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-primary font-bold hover:underline py-1 flex items-center gap-1"
                              >
                                <Phone size={10} /> Pedir Cancelamento
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <img src={prof?.avatar} alt="" className="w-8 h-8 rounded-lg object-cover bg-neutral-100" />
                          <div>
                            <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">Especialista</p>
                            <p className="text-[10px] font-bold text-neutral-800 uppercase tracking-tighter">{prof?.name || 'Profissional'}</p>
                          </div>
                        </div>

                        <div className="flex gap-4 pt-3 border-t border-neutral-50">
                          <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-xl">
                            <CalendarIcon size={12} /> {app.date.split('-').reverse().join('/')}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-xl">
                            <Clock size={12} /> {app.time}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : step === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pb-24 pt-4"
            >
              <div className="flex items-center justify-between mb-10 sticky top-4 bg-white/60 backdrop-blur-xl p-4 rounded-3xl border border-white shadow-xl shadow-primary/5 z-20">
                <div>
                  <h2 className="text-2xl text-primary font-serif">Agenda Profissional</h2>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep('home')} className="p-3 bg-neutral-50 text-neutral-400 hover:text-primary rounded-2xl transition-all">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={logout} className="p-3 bg-neutral-50 text-neutral-400 hover:text-red-400 rounded-2xl transition-all">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>

              {!isAdmin ? (
                <div className="text-center p-12 bg-white rounded-[40px] border border-red-50 space-y-6 shadow-xl shadow-red-500/5">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto">
                    <AlertCircle size={32} />
                  </div>
                  <div>
                    <h3 className="text-red-800 font-serif text-lg">Acesso Negado</h3>
                    <p className="text-xs text-red-600/60 mt-1 uppercase tracking-widest font-bold">Não Autorizado</p>
                  </div>
                  <p className="text-sm text-neutral-500 leading-relaxed">Este painel é exclusivo para o administrador.</p>
                  <Button variant="ghost" onClick={logout} className="w-full">Sair</Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Simplified Tab Switcher */}
                  <div className="flex bg-neutral-50 p-1 rounded-2xl border border-neutral-100">
                    {[
                      { id: 'agenda', icon: CalendarIcon, label: 'Agenda' },
                      { id: 'folgas', icon: CalendarDays, label: 'Folgas' },
                      { id: 'usuarios', icon: UserX, label: 'Clientes' },
                      { id: 'equipe', icon: Settings, label: 'Equipe' },
                      { id: 'bloqueios', icon: Coffee, label: 'Pausas' }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setAdminTab(tab.id as any)}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                          adminTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {adminTab === 'bloqueios' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-white p-6 rounded-[32px] border border-neutral-100 space-y-4">
                        <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Bloquear Horário</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <select 
                            value={newBlockProfessional}
                            onChange={e => setNewBlockProfessional(e.target.value)}
                            className="bg-neutral-50 px-4 py-2.5 rounded-xl border-none text-[11px] font-bold uppercase outline-none col-span-2"
                          >
                            <option value="">Selecione Profissional</option>
                            {liveProfessionals.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <input 
                            type="date"
                            value={newBlockDate}
                            onChange={e => setNewBlockDate(e.target.value)}
                            className="bg-neutral-50 px-4 py-2.5 rounded-xl border-none text-[11px] font-bold outline-none"
                          />
                          <select 
                            value={newBlockTime}
                            onChange={e => setNewBlockTime(e.target.value)}
                            className="bg-neutral-50 px-4 py-2.5 rounded-xl border-none text-[11px] font-bold uppercase outline-none"
                          >
                            <option value="">Horário</option>
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <select 
                            value={newBlockReason}
                            onChange={e => setNewBlockReason(e.target.value)}
                            className="bg-neutral-50 px-4 py-2.5 rounded-xl border-none text-[11px] font-bold uppercase outline-none col-span-2"
                          >
                            <option value="Almoço">Almoço</option>
                            <option value="Intervalo">Intervalo</option>
                            <option value="Imprevisto">Imprevisto</option>
                            <option value="Pessoal">Pessoal</option>
                          </select>
                          <Button 
                            onClick={async () => {
                              if (!newBlockProfessional || !newBlockDate || !newBlockTime) return;
                              await handleAddTimeBlock(newBlockProfessional, newBlockDate, newBlockTime, newBlockReason);
                              setNewBlockTime('');
                              alert('Bloqueado!');
                            }} 
                            className="py-2.5 col-span-2 text-[11px] font-bold uppercase"
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 px-2">
                        <h4 className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold ml-1">Bloqueios Ativos</h4>
                        <div className="grid gap-2">
                          {timeBlocks.filter(tb => new Date(tb.date) >= new Date(new Date().setHours(0,0,0,0))).length > 0 ? (
                             timeBlocks
                              .filter(tb => new Date(tb.date) >= new Date(new Date().setHours(0,0,0,0)))
                              .sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                              .map(tb => {
                                const prof = liveProfessionals.find(p => p.id === tb.professionalId);
                                return (
                                  <div key={tb.id} className="p-3 bg-white rounded-2xl border border-neutral-100 flex justify-between items-center">
                                    <div>
                                      <p className="text-[11px] font-bold text-neutral-800">{tb.date.split('-').reverse().join('/')} às {tb.time}</p>
                                      <p className="text-[9px] text-primary font-bold uppercase">{prof?.name} • {tb.reason}</p>
                                    </div>
                                    <button 
                                      onClick={async () => { if (confirm('Liberar?')) await deleteDoc(doc(db, 'time_blocks', tb.id)); }}
                                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                );
                              })
                          ) : (
                            <p className="text-center py-4 text-[10px] text-neutral-400 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">Sem bloqueios</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'usuarios' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-white p-6 rounded-[32px] border border-neutral-100 space-y-4 shadow-sm">
                        <div className="flex justify-between items-center px-1">
                          <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Base de Clientes</h3>
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg">
                            {Object.keys(userStatuses).length} Registrados
                          </span>
                        </div>
                        
                        <div className="grid gap-2">
                          {Object.keys(userStatuses).length === 0 ? (
                            <p className="text-center py-8 text-[11px] text-neutral-400 italic">Nenhum cliente registrado</p>
                          ) : (
                            Object.entries(userStatuses).map(([userId, status]) => (
                              <div key={userId} className="p-4 bg-neutral-50 rounded-2xl flex justify-between items-center border border-transparent hover:border-neutral-200 transition-all">
                                <div className="min-w-0 pr-4">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-[11px] font-bold text-neutral-800 truncate">{status.email?.split('@')[0] || 'Cliente'}</p>
                                    {status.isAdmin && <span className="bg-neutral-800 text-white text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Admin</span>}
                                  </div>
                                  <p className="text-[9px] text-neutral-400 font-bold lowercase truncate opacity-60">{status.email || userId}</p>
                                  <div className="flex gap-2 mt-2">
                                    {status.isFlagged && <span className="text-[7px] font-bold text-orange-500 uppercase flex items-center gap-0.5"><Flag size={8} /> Obs Ativa</span>}
                                    {status.isBlocked && <span className="text-[7px] font-bold text-red-500 uppercase flex items-center gap-0.5"><ShieldAlert size={8} /> Bloqueado</span>}
                                  </div>
                                </div>
                                
                                <div className="flex gap-2 shrink-0">
                                  <button 
                                    onClick={() => handleUpdateUserStatus(userId, 'flag')}
                                    className={`p-2 rounded-xl border transition-all ${status.isFlagged ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-neutral-400 border-neutral-100'}`}
                                  >
                                    <Flag size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateUserStatus(userId, 'block')}
                                    className={`p-2 rounded-xl border transition-all ${status.isBlocked ? 'bg-red-500 text-white border-red-600' : 'bg-white text-neutral-400 border-neutral-100'}`}
                                  >
                                    <UserX size={14} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'equipe' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-white p-6 rounded-[32px] border border-neutral-100 space-y-4 shadow-sm">
                        <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Gerenciar Serviços</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {liveServices.map(s => (
                            <div key={s.id} className="p-3 bg-neutral-50 rounded-xl flex justify-between items-center group">
                              <div className="truncate min-w-0 pr-2">
                                <p className="text-[10px] font-bold text-neutral-700 truncate">{s.name}</p>
                                <p className="text-[8px] text-neutral-400 font-bold uppercase truncate">{s.category}</p>
                              </div>
                              <button 
                                onClick={async () => { if (confirm('Excluir?')) await deleteDoc(doc(db, 'services', s.id)); }}
                                className="text-red-300 hover:text-red-500 p-1 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 border-t border-neutral-50 space-y-2">
                          <input 
                            type="text" 
                            placeholder="Nome do novo serviço..."
                            value={newServiceName}
                            onChange={e => setNewServiceName(e.target.value)}
                            className="w-full bg-neutral-50 px-4 py-2.5 rounded-xl text-[11px] font-bold outline-none placeholder:text-neutral-300"
                          />
                          <select 
                            value={isNewCategory ? 'new' : newServiceCategory}
                            onChange={e => e.target.value === 'new' ? setIsNewCategory(true) : (setIsNewCategory(false), setNewServiceCategory(e.target.value))}
                            className="w-full bg-neutral-50 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase outline-none"
                          >
                            {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            <option value="new">+ Nova Categoria</option>
                          </select>
                          {isNewCategory && (
                            <input 
                              type="text" 
                              placeholder="Título da categoria..."
                              value={customCategory}
                              onChange={e => setCustomCategory(e.target.value)}
                              className="w-full bg-primary/5 px-4 py-2.5 rounded-xl text-[11px] font-bold outline-none border border-primary/10"
                            />
                          )}
                          <Button onClick={handleCreateGlobalService} className="w-full py-2.5 text-[11px] font-bold uppercase ring-offset-2">Adicionar ao Catálogo</Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-4">Configurar Profissionais</h3>
                        <div className="space-y-3">
                          {liveProfessionals.map(p => (
                            <div key={p.id} className="bg-white p-5 rounded-[32px] border border-neutral-100 shadow-sm space-y-4">
                              <div className="flex items-center gap-3">
                                <img src={p.avatar} className="w-10 h-10 rounded-2xl object-cover" />
                                <div>
                                  <h4 className="text-sm font-bold text-neutral-800">{p.name}</h4>
                                  <p className="text-[9px] text-neutral-400 font-bold uppercase">{p.role}</p>
                                </div>
                              </div>
                              <div className="grid gap-2">
                                {p.services.map(ps => {
                                  const serviceInfo = liveServices.find(ls => ls.id === ps.serviceId);
                                  return (
                                    <div key={ps.serviceId} className="flex gap-2 items-center bg-neutral-50 px-3 py-2.5 rounded-xl">
                                      <span className="flex-1 text-[10px] font-bold text-neutral-600 truncate">{serviceInfo?.name || ps.serviceId}</span>
                                      <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-neutral-200/50">
                                        <span className="text-[8px] text-neutral-400 font-bold uppercase">R$</span>
                                        <input 
                                          type="number"
                                          defaultValue={ps.price}
                                          onBlur={(e) => handleUpdateProfessionalService(p.id, ps.serviceId, Number(e.target.value))}
                                          className="w-10 text-[10px] font-bold text-primary outline-none bg-transparent"
                                        />
                                      </div>
                                      <button onClick={() => handleRemoveServiceFromProfessional(p.id, ps.serviceId)} className="p-1.5 text-neutral-300 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="pt-2 border-t border-neutral-50">
                                <p className="text-[8px] font-bold text-neutral-300 uppercase tracking-tighter mb-2">Vincular mais:</p>
                                <div className="flex gap-1.5 flex-wrap">
                                  {liveServices.filter(ls => !p.services.some(ps => ps.serviceId === ls.id)).map(ls => (
                                    <button 
                                      key={ls.id}
                                      onClick={() => handleAddServiceToProfessional(p.id, ls.id, 0)}
                                      className="px-3 py-1.5 bg-neutral-50 hover:bg-primary/5 hover:text-primary rounded-lg text-[9px] font-bold text-neutral-400 transition-all border border-transparent hover:border-primary/10"
                                    >
                                      + {ls.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'agenda' && (
                    <div className="space-y-6">
                      {/* Integrated Filter Section */}
                      <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm overflow-hidden">
                        <div className="p-4 space-y-4">
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                              <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={adminSearch}
                                onChange={(e) => setAdminSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-neutral-50 rounded-2xl text-[11px] font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/10"
                              />
                            </div>
                            <select 
                              value={adminProfessionalFilter}
                              onChange={e => setAdminProfessionalFilter(e.target.value)}
                              className="px-4 py-3 bg-neutral-50 rounded-2xl text-[11px] font-bold uppercase tracking-wider outline-none border-none"
                            >
                              <option value="all">Equipe: Todos</option>
                              {(liveProfessionals.length > 0 ? liveProfessionals : PROFESSIONALS).map(p => (
                                <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-4 items-center justify-between px-1">
                            <div className="flex gap-6">
                              <div className="flex flex-col">
                                <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-tighter">Hoje</span>
                                <span className="text-lg font-serif text-primary leading-none">
                                  {appointments.filter(a => (adminProfessionalFilter === 'all' || a.professionalId === adminProfessionalFilter) && a.date === new Date().toISOString().split('T')[0]).length}
                                </span>
                              </div>
                              <div className="flex flex-col border-l border-neutral-100 pl-6">
                                <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-tighter">Total</span>
                                <span className="text-lg font-serif text-primary leading-none">
                                  {appointments.filter(a => adminProfessionalFilter === 'all' || a.professionalId === adminProfessionalFilter).length}
                                </span>
                              </div>
                            </div>
                            {adminDateFilter !== 'all' && (
                              <button onClick={() => setAdminDateFilter('all')} className="text-[10px] text-primary font-bold underline">Limpar Data</button>
                            )}
                          </div>
                        </div>

                        {/* Horizontal Date Picker */}
                        <div 
                          ref={scrollContainerRef}
                          className="flex gap-1.5 overflow-x-auto p-4 pt-0 scrollbar-hide scroll-smooth"
                        >
                          <button 
                            onClick={() => setAdminDateFilter('all')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border ${
                              adminDateFilter === 'all' 
                                ? 'bg-primary text-white border-primary shadow-sm' 
                                : 'bg-neutral-50 text-neutral-400 border-transparent hover:bg-neutral-100'
                            }`}
                          >
                            Tudo
                          </button>
                          {[...Array(14)].map((_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() + i);
                            const dateStr = d.toISOString().split('T')[0];
                            return (
                              <button 
                                key={dateStr}
                                onClick={() => setAdminDateFilter(dateStr)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border flex gap-2 items-center ${
                                  adminDateFilter === dateStr 
                                    ? 'bg-primary text-white border-primary shadow-sm' 
                                    : 'bg-neutral-50 text-neutral-400 border-transparent'
                                }`}
                              >
                                <span className="opacity-60 uppercase">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','')}</span>
                                <span>{d.getDate()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center px-4">
                          <h3 className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                            {adminDateFilter === 'all' ? 'Relatório de Agendamentos' : `Agenda: ${new Date(adminDateFilter + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`}
                          </h3>
                        </div>
                        
                        {appointments.filter(a => {
                          const matchesDate = adminDateFilter === 'all' || a.date === adminDateFilter;
                          const matchesProf = adminProfessionalFilter === 'all' || a.professionalId === adminProfessionalFilter;
                          const matchesSearch = !adminSearch || 
                            (a.customerName?.toLowerCase().includes(adminSearch.toLowerCase()) || 
                             a.customerPhone?.toLowerCase().includes(adminSearch.toLowerCase()));
                          return matchesDate && matchesProf && matchesSearch;
                        }).length === 0 ? (
                          <div className="text-center p-16 text-neutral-300 bg-white rounded-[40px] border border-dashed border-neutral-200">
                            Nenhum agendamento encontrado
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {appointments
                              .filter(a => {
                                const matchesDate = adminDateFilter === 'all' || a.date === adminDateFilter;
                                const matchesProfessional = adminProfessionalFilter === 'all' || a.professionalId === adminProfessionalFilter;
                                const matchesSearch = !adminSearch || 
                                  (a.customerName?.toLowerCase().includes(adminSearch.toLowerCase()) || 
                                   a.customerPhone?.toLowerCase().includes(adminSearch.toLowerCase()));
                                return matchesDate && matchesProfessional && matchesSearch;
                              })
                              .map(app => (
                                <motion.div 
                                  key={app.id} 
                                  layout
                                  onClick={() => setExpandedAppointmentId(expandedAppointmentId === app.id ? null : app.id!)}
                                  className={`p-5 bg-white rounded-3xl border transition-all space-y-4 cursor-pointer ${
                                    expandedAppointmentId === app.id ? 'border-primary shadow-lg shadow-primary/5' : 'border-neutral-100 shadow-sm'
                                  } hover:border-primary/20`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex gap-4 min-w-0">
                                      <div className="bg-neutral-50 px-3 py-1.5 rounded-xl text-center h-fit shrink-0 border border-neutral-100/50">
                                        <p className="text-xs font-bold text-neutral-800">{app.time}</p>
                                        <p className="text-[8px] text-neutral-400 font-bold uppercase">{app.date.split('-').reverse().slice(0,2).join('/')}</p>
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <p className="font-bold text-neutral-800 truncate">{app.customerName}</p>
                                          {userStatuses[app.customerId]?.isFlagged && <div className="w-1.5 h-1.5 bg-orange-400 rounded-full shrink-0" />}
                                          {userStatuses[app.customerId]?.isBlocked && <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />}
                                          {app.description && <MessageSquare size={10} className="text-primary shrink-0" />}
                                        </div>
                                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider truncate">
                                          {app.serviceName} • <span className="text-primary/60">{app.professionalName.split(' ')[0]}</span>
                                        </p>
                                      </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider ${
                                      app.status === 'confirmed' ? 'bg-green-50 text-green-600' : 
                                      app.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                    }`}>
                                      {app.status === 'pending' ? 'Pendente' : app.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-1">
                                    <div className="flex gap-1.5">
                                      <a 
                                        href={`https://wa.me/${app.customerPhone.replace(/\D/g,'')}`} 
                                        target="_blank" 
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 bg-neutral-50 text-neutral-400 hover:text-green-500 rounded-xl transition-colors border border-transparent hover:border-green-100"
                                      >
                                        <Phone size={14} />
                                      </a>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setExpandedAppointmentId(expandedAppointmentId === app.id ? null : app.id!); }}
                                        className={`p-2 rounded-xl transition-colors ${expandedAppointmentId === app.id ? 'bg-primary/10 text-primary' : 'bg-neutral-50 text-neutral-400'}`}
                                      >
                                        <Settings size={14} />
                                      </button>
                                    </div>

                                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      {app.paymentStatus === 'paid' && app.status !== 'confirmed' ? (
                                        <button 
                                          onClick={() => handleVerifyPayment(app.id!)}
                                          className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-bold shadow-md shadow-primary/20 animate-pulse"
                                        >
                                          Validar PIX
                                        </button>
                                      ) : app.status !== 'confirmed' && (
                                        <button 
                                          onClick={() => handleUpdateStatus(app.id!, 'confirmed')}
                                          className="bg-neutral-800 text-white px-4 py-2 rounded-xl text-[10px] font-bold shadow-sm"
                                        >
                                          Confirmar
                                        </button>
                                      )}
                                      
                                      {app.status === 'confirmed' && (
                                        <button 
                                          onClick={() => handleUpdateStatus(app.id!, 'cancelled')}
                                          className="px-3 py-2 text-neutral-400 hover:text-red-400 text-[10px] font-bold transition-colors"
                                        >
                                          Cancelar
                                        </button>
                                      )}
                                      
                                      {app.status === 'cancelled' && (
                                         <button 
                                          onClick={() => handleUpdateStatus(app.id!, 'confirmed')}
                                          className="px-3 py-2 text-neutral-400 hover:text-green-500 text-[10px] font-bold transition-colors"
                                        >
                                          Reativar
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <AnimatePresence>
                                    {expandedAppointmentId === app.id && (
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="pt-4 border-t border-dashed border-neutral-100 space-y-4">
                                          {app.description && (
                                            <div className="p-3 bg-neutral-50 rounded-2xl text-[11px] text-neutral-500 font-light italic border border-neutral-100">
                                              "{app.description}"
                                            </div>
                                          )}
                                          
                                          <div className="flex gap-2">
                                            <button 
                                              onClick={() => handleUpdateUserStatus(app.customerId, 'flag')}
                                              className={`flex-1 py-2.5 px-3 rounded-xl text-[9px] font-bold border transition-all ${
                                                userStatuses[app.customerId]?.isFlagged ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-neutral-100 text-neutral-400 hover:border-orange-200 hover:text-orange-400'
                                              }`}
                                            >
                                              {userStatuses[app.customerId]?.isFlagged ? 'Observação: Sim' : 'Marcar Observação'}
                                            </button>
                                            <button 
                                              onClick={() => handleUpdateUserStatus(app.customerId, 'block')}
                                              className={`flex-1 py-2.5 px-3 rounded-xl text-[9px] font-bold border transition-all ${
                                                userStatuses[app.customerId]?.isBlocked ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-neutral-100 text-neutral-400 hover:border-red-200 hover:text-red-400'
                                              }`}
                                            >
                                              {userStatuses[app.customerId]?.isBlocked ? 'Bloqueio: Sim' : 'Bloquear Conta'}
                                            </button>
                                            <button 
                                              onClick={() => handleDeleteAppointment(app.id!)}
                                              className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all ml-auto border border-transparent hover:border-red-600"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                  
                                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    {app.paymentStatus === 'pending' && app.status !== 'cancelled' && (
                                      <div className="flex-1 px-3 py-1 bg-neutral-50 rounded-xl text-[7px] font-bold text-neutral-300 uppercase tracking-widest text-center border border-dashed border-neutral-100">
                                        Aguardando Pagamento
                                      </div>
                                    )}
                                    {app.paymentStatus === 'verified' && (
                                      <div className="flex-1 px-3 py-1 bg-green-50 rounded-xl text-[7px] font-bold text-green-500 uppercase tracking-widest text-center border border-green-100/50">
                                        Pagamento Validado
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === 'folgas' && (
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-neutral-100">
                        <h3 className="text-lg text-primary font-serif mb-4">Escolha os dias de folga</h3>
                        <CustomCalendar 
                          selectedDate="" 
                          onSelect={handleToggleDayOff} 
                          daysOff={daysOff.map(d => d.date)} 
                        />
                        <div className="mt-6 p-4 bg-primary/5 rounded-2xl flex items-start gap-4">
                          <AlertCircle size={20} className="text-primary shrink-0 mt-0.5" />
                          <p className="text-[11px] text-neutral-500 leading-relaxed italic">
                            Dias marcados com um <span className="text-red-400 font-bold underline">ponto vermelho</span> estão bloqueados para novos agendamentos no calendário dos clientes.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold ml-2">Datas Bloqueadas</h3>
                        {daysOff.length === 0 ? (
                          <div className="text-center p-12 text-neutral-300 bg-white/40 rounded-[32px] border border-dashed border-neutral-200">
                            Nenhuma folga programada
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {daysOff.sort((a,b) => a.date.localeCompare(b.date)).map(day => (
                              <div key={day.id} className="bg-white p-4 rounded-2xl border border-neutral-100 flex justify-between items-center shadow-sm">
                                <span className="text-xs font-bold text-neutral-700">{day.date.split('-').reverse().join('/')}</span>
                                <button onClick={() => handleToggleDayOff(day.date)} className="text-red-400 hover:text-red-600 p-1">
                                  <XCircle size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Booking Reminder Modal */}
        <AnimatePresence>
          {showBookingReminder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
                onClick={() => setShowBookingReminder(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto">
                    <CalendarIcon size={32} />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-serif text-primary">Você já tem agendamentos!</h3>
                    <p className="text-sm text-neutral-500 font-light px-4">Notamos que você já possui horários marcados conosco. Veja abaixo:</p>
                  </div>

                  <div className="space-y-3 max-h-[30vh] overflow-y-auto px-1">
                    {userAppointments.map(app => {
                      const [year, month, day] = app.date.split('-');
                      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                      return (
                        <div key={app.id} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center text-primary border border-neutral-50">
                            <span className="text-[10px] font-bold uppercase">{months[parseInt(month) - 1]}</span>
                            <span className="text-sm font-bold leading-none">{day}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-neutral-800 truncate text-sm">{app.serviceName}</p>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{app.time} • Profissional Atribuído</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] text-primary font-bold text-center leading-relaxed">
                      Se algum desses horários estiver incorreto ou se você deseja cancelar, 
                      <span className="block mt-1 underline">por favor, entre em contato via WhatsApp.</span>
                    </p>
                  </div>

                  <div className="grid gap-3 pt-2">
                    <Button onClick={() => setShowBookingReminder(false)} className="w-full h-14 rounded-2xl shadow-lg shadow-primary/20">
                      Desejo marcar mais um horário
                    </Button>
                    <Button variant="ghost" onClick={() => { setStep('my-appointments'); setShowBookingReminder(false); }} className="w-full h-14 text-neutral-500 font-light text-xs">
                      Ver meus horários detalhados
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
