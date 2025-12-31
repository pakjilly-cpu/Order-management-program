import React, { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { VendorPortal } from './components/VendorPortal';
import { LoginScreen } from './components/LoginScreen';
import { OrderItem, AppView, User } from './types';

const MOCK_INITIAL_DATA: OrderItem[] = [];

// 외주처별 고정 로그인 코드
const VALID_VENDOR_CODES: Record<string, string> = {
  '위드맘': '200131',
  '그램': '200216',
  '리니어': '200101',
  '디딤테크': '308803',
  '씨엘로': '200008',
  '신세계': '200004',
  '엠큐브': '111111',
  '메이코스': '222222'
};

// Fallback codes if local storage is empty
const INITIAL_VENDOR_CODES: Record<string, string> = { ...VALID_VENDOR_CODES };

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Persistent Orders
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('daily_orders');
    return saved ? JSON.parse(saved) : MOCK_INITIAL_DATA;
  });

  // Persistent Codes (Vendor Name -> 6-digit Code)
  const [vendorCodes, setVendorCodes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('vendor_codes');
    return saved ? JSON.parse(saved) : INITIAL_VENDOR_CODES;
  });

  // --- Auth & Persistence Logic ---

  useEffect(() => {
    // Check for existing session in both LocalStorage (Remember Me) and SessionStorage (One time)
    const savedUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    
    if (savedUser) {
      const user = JSON.parse(savedUser) as User;
      setCurrentUser(user);
      if (user.type === 'ADMIN') {
        setCurrentView(AppView.ADMIN_DASHBOARD);
      } else {
        setCurrentView(AppView.VENDOR_PORTAL);
      }
    } else {
      // Legacy support: Check for hash link login (auto-login via link)
      // If user clicks a link with hash #portal/123456, we try to log them in
      const hash = window.location.hash;
      if (hash.startsWith('#portal/')) {
        const code = hash.replace('#portal/', '');
        // For link access, we treat it as temporary session (false for rememberMe)
        handleLogin(code, false); 
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('daily_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('vendor_codes', JSON.stringify(vendorCodes));
  }, [vendorCodes]);

  const handleLogin = async (code: string, rememberMe: boolean): Promise<boolean> => {
    let user: User | null = null;

    // 1. Check Admin (9 digits)
    if (code.length === 9) {
      user = { type: 'ADMIN', id: code, name: '관리자' };
    }
    // 2. Check Vendor (6 digits) - 고정된 코드만 허용
    else if (code.length === 6) {
      // Find vendor by code from VALID_VENDOR_CODES only
      const vendorName = Object.keys(VALID_VENDOR_CODES).find(key => VALID_VENDOR_CODES[key] === code);
      if (vendorName) {
        user = { type: 'VENDOR', id: vendorName, name: vendorName };
      }
    }

    if (user) {
      setCurrentUser(user);
      const userStr = JSON.stringify(user);
      
      if (rememberMe) {
        localStorage.setItem('auth_user', userStr);
        sessionStorage.removeItem('auth_user'); // Clean up session if upgrading to local
      } else {
        sessionStorage.setItem('auth_user', userStr);
        localStorage.removeItem('auth_user'); // Clean up local if downgrading to session
      }

      if (user.type === 'ADMIN') {
        setCurrentView(AppView.ADMIN_DASHBOARD);
      } else {
        setCurrentView(AppView.VENDOR_PORTAL);
      }
      window.location.hash = ''; // Clear hash if any
      return true;
    }

    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_user');
    setCurrentUser(null);
    setCurrentView(AppView.LOGIN);
    window.location.hash = '';
  };

  // --- Dashboard Logic ---

  const handleToggleItem = (itemId: string) => {
    setOrders(prev => prev.map(item => 
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  const navigateToVendorPreview = (code: string) => {
    const vendorName = Object.keys(vendorCodes).find(key => vendorCodes[key] === code);
    if(vendorName) {
        setPreviewVendorName(vendorName);
    }
  };

  const [previewVendorName, setPreviewVendorName] = useState<string | null>(null);

  // Render Logic
  if (currentView === AppView.LOGIN) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (currentView === AppView.ADMIN_DASHBOARD) {
    if (previewVendorName) {
       return (
         <VendorPortal 
           vendorName={previewVendorName}
           orders={orders}
           onToggleItem={handleToggleItem}
           onBack={() => setPreviewVendorName(null)} // Admin returning
         />
       );
    }

    return (
      <AdminDashboard 
        user={currentUser!}
        orders={orders} 
        setOrders={setOrders}
        vendorCodes={vendorCodes}
        setVendorCodes={setVendorCodes}
        onNavigateToVendor={navigateToVendorPreview}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === AppView.VENDOR_PORTAL && currentUser?.type === 'VENDOR') {
    return (
      <VendorPortal 
        vendorName={currentUser.id} 
        orders={orders} 
        onToggleItem={handleToggleItem}
        onLogout={handleLogout}
      />
    );
  }

  // Fallback
  return <LoginScreen onLogin={handleLogin} />;
};

export default App;