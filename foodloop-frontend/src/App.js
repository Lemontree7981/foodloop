import React, { useState, useEffect } from 'react';
import {
  MapPin, Clock, Users, Phone, LogOut, Utensils, Package, AlertCircle,
  Eye, EyeOff, CheckCircle, X, Leaf, Drumstick, Cookie, Coffee,
  ChefHat, Timer, User, Heart, TrendingUp
} from 'lucide-react';
import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import './App.css';

const API_URL = 'http://localhost:5000/api';

// --- FOOD CATEGORIES ---
const FOOD_CATEGORIES = [
  { value: 'vegetarian', label: 'Vegetarian', icon: Leaf, color: '#38ef7d' },
  { value: 'non-vegetarian', label: 'Non-Vegetarian', icon: Drumstick, color: '#f5576c' },
  { value: 'vegan', label: 'Vegan', icon: Leaf, color: '#11998e' },
  { value: 'desserts', label: 'Desserts', icon: Cookie, color: '#f093fb' },
  { value: 'beverages', label: 'Beverages', icon: Coffee, color: '#667eea' },
  { value: 'mixed', label: 'Mixed', icon: ChefHat, color: '#764ba2' }
];

// --- VALIDATION HELPERS ---
const validateEmail = (email) => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

const validatePhone = (phone) => {
  if (!phone) return 'Phone number is required';
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  if (!phoneRegex.test(cleanPhone)) return 'Please enter a valid phone number (10-15 digits)';
  return null;
};

const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
};

const validateName = (name) => {
  if (!name) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  return null;
};

const validateAddress = (address) => {
  if (!address) return 'Address is required';
  if (address.trim().length < 5) return 'Please enter a complete address';
  return null;
};

// --- HELPER FUNCTIONS ---
const formatTimeRemaining = (expiryDateString) => {
  const expiryDate = new Date(expiryDateString);
  const diff = expiryDate - new Date();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (diff < 0) return { text: "Expired", urgent: true };
  if (hours < 1) return { text: `${minutes}m left`, urgent: true };
  return { text: `${hours}h ${minutes}m left`, urgent: hours < 2 };
};

const getCategoryInfo = (category) => {
  return FOOD_CATEGORIES.find(c => c.value === category) || FOOD_CATEGORIES[5];
};

// --- TOAST NOTIFICATION COMPONENT ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      <span>{message}</span>
      <button className="toast-close" onClick={onClose}><X size={16} /></button>
    </div>
  );
};

// --- STATS CARD COMPONENT ---
const StatsCard = ({ icon: Icon, label, value, color }) => (
  <div className="stats-card" style={{ '--accent-color': color }}>
    <div className="stats-icon"><Icon size={24} /></div>
    <div className="stats-info">
      <span className="stats-value">{value}</span>
      <span className="stats-label">{label}</span>
    </div>
  </div>
);

// --- LANDING PAGE COMPONENT ---
const LandingPage = ({ onLogin, onRegister, loading, error, serverErrors }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'donor',
    address: '',
    organization: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field, value) => {
    let error = null;
    switch (field) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'name':
        error = validateName(value);
        break;
      case 'phone':
        error = validatePhone(value);
        break;
      case 'address':
        if (!isLogin) error = validateAddress(value);
        break;
      default:
        break;
    }
    setFormErrors(prev => ({ ...prev, [field]: error }));
    return error;
  };

  const validateForm = () => {
    const errors = {};
    errors.email = validateEmail(formData.email);
    errors.password = validatePassword(formData.password);

    if (!isLogin) {
      errors.name = validateName(formData.name);
      errors.phone = validatePhone(formData.phone);
      errors.address = validateAddress(formData.address);
    }

    setFormErrors(errors);
    setTouched({ email: true, password: true, name: true, phone: true, address: true });

    return !Object.values(errors).some(e => e !== null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isLogin) {
      onLogin(formData.email, formData.password);
    } else {
      onRegister(formData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const allErrors = { ...formErrors, ...serverErrors };

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="brand-section">
          <h1 className="brand-logo">🍽️ FoodLoop</h1>
          <p className="brand-tagline">Connect surplus food with those who need it</p>

          {/* Stats Preview */}
          <div className="landing-stats">
            <div className="landing-stat">
              <span className="landing-stat-value">1,250+</span>
              <span className="landing-stat-label">Meals Shared</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value">500+</span>
              <span className="landing-stat-label">Donors</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value">50+</span>
              <span className="landing-stat-label">NGOs</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Join FoodLoop'}</h2>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in to continue sharing food' : 'Start making a difference today'}
          </p>

          {error && (
            <div className="error-alert">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className={`form-input ${touched.name && allErrors.name ? 'error' : ''}`}
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                  />
                  {touched.name && allErrors.name && (
                    <div className="error-message">
                      <AlertCircle size={14} />
                      {allErrors.name}
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className={`form-input ${touched.phone && allErrors.phone ? 'error' : ''}`}
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                    />
                    {touched.phone && allErrors.phone && (
                      <div className="error-message">
                        <AlertCircle size={14} />
                        {allErrors.phone}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">I want to</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                    >
                      <option value="donor">Donate Food</option>
                      <option value="receiver">Receive Food</option>
                      <option value="volunteer">Volunteer</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Organization (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Restaurant, NGO, or Company name"
                    value={formData.organization}
                    onChange={(e) => handleInputChange('organization', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className={`form-input ${touched.address && allErrors.address ? 'error' : ''}`}
                    placeholder="Enter your address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                  />
                  {touched.address && allErrors.address && (
                    <div className="error-message">
                      <AlertCircle size={14} />
                      {allErrors.address}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className={`form-input ${touched.email && allErrors.email ? 'error' : ''}`}
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
              />
              {touched.email && allErrors.email && (
                <div className="error-message">
                  <AlertCircle size={14} />
                  {allErrors.email}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-input ${touched.password && allErrors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {touched.password && allErrors.password && (
                <div className="error-message">
                  <AlertCircle size={14} />
                  {allErrors.password}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner"></span>
                  Please wait...
                </span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="auth-toggle">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span
              className="auth-toggle-link"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormErrors({});
                setTouched({});
                setShowPassword(false);
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [currentView, setCurrentView] = useState('listings');
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverErrors, setServerErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ meals: 0, donors: 0, claims: 0 });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Listen to Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        const token = await currentUser.getIdToken();
        setAuthToken(token);
        syncUserWithBackend(token);
      } else {
        setUser(null);
        setAuthToken(null);
        setCurrentView('listings');
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync with Backend
  const syncUserWithBackend = async (token) => {
    try {
      const res = await fetch(`${API_URL}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setCurrentView('listings');
      }
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  // API Headers
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  });

  // Fetch Listings
  const fetchListings = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/listings`, { headers: getHeaders() });
      const data = await res.json();
      const allListings = data.listings || [];
      setListings(allListings);

      // Calculate stats
      setStats({
        meals: allListings.reduce((acc, l) => acc + parseInt(l.quantity) || 1, 0),
        donors: new Set(allListings.map(l => l.donor_id)).size,
        claims: claims.length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch My Listings (for donors)
  const fetchMyListings = async () => {
    if (!authToken || user?.role !== 'donor') return;
    try {
      const res = await fetch(`${API_URL}/listings?donor_id=${user.id}`, { headers: getHeaders() });
      const data = await res.json();
      setMyListings(data.listings || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Claims
  const fetchMyClaims = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/claims/my-claims`, { headers: getHeaders() });
      const data = await res.json();
      setClaims(data.claims || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && authToken) {
      if (currentView === 'listings') fetchListings();
      if (currentView === 'claimed') fetchMyClaims();
      if (currentView === 'my-donations') fetchMyListings();
    }
  }, [currentView, user, authToken]);

  // Login Handler
  const handleLogin = async (email, password) => {
    setLoading(true);
    setError(null);
    setServerErrors({});
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Welcome back! 👋');
    } catch (err) {
      let message = 'Login failed. Please try again.';
      if (err.code === 'auth/user-not-found') {
        message = 'No account found with this email';
      } else if (err.code === 'auth/wrong-password') {
        message = 'Incorrect password';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password';
      }
      setError(message);
      setLoading(false);
    }
  };

  // Register Handler
  const handleRegister = async (formData) => {
    setLoading(true);
    setError(null);
    setServerErrors({});
    try {
      const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const token = await cred.user.getIdToken();

      const res = await fetch(`${API_URL}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          address: formData.address,
          organization: formData.organization
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.validationErrors) {
          setServerErrors(data.validationErrors);
          setError('Please fix the errors below');
        } else {
          setError(data.error || 'Registration failed');
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        setAuthToken(token);
        setUser(data.user);
        setCurrentView('listings');
        showToast('Welcome to FoodLoop! 🎉');
      }
    } catch (err) {
      let message = 'Registration failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    await signOut(auth);
    showToast('See you soon! 👋', 'info');
  };

  // Post Food Handler
  const handlePostFood = async (postData) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/listings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          food_type: postData.food_type,
          quantity: postData.quantity,
          description: postData.description,
          address: postData.address,
          contact: postData.contact,
          food_category: postData.food_category,
          latitude: postData.latitude || 12.97,
          longitude: postData.longitude || 77.59,
          expiry_hours: postData.expiry_hours || 4
        })
      });

      if (res.ok) {
        showToast('Food donation posted successfully! 🍽️');
        setCurrentView('listings');
        fetchListings();
      }
    } catch (err) {
      console.error("Error posting", err);
      showToast('Failed to post donation', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Claim Handler
  const handleClaim = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/claims`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ listing_id: id })
      });

      if (res.ok) {
        showToast('Food claimed successfully! 🎉');
        fetchListings();
      }
    } catch (err) {
      console.error("Error claiming", err);
      showToast('Failed to claim food', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show landing page if not logged in
  if (!user && !firebaseUser) {
    return (
      <LandingPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        loading={loading}
        error={error}
        serverErrors={serverErrors}
      />
    );
  }

  // Loading state while syncing
  if (firebaseUser && !user) {
    return (
      <div className="landing-page">
        <div className="loading-overlay">
          <div className="loading-spinner-large"></div>
          <span>Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            🍽️ FoodLoop
            <span className="header-role">{user?.role}</span>
          </div>
          <nav className="header-nav">
            <button
              className={`nav-btn ${currentView === 'listings' ? 'active' : ''}`}
              onClick={() => setCurrentView('listings')}
            >
              <Utensils size={16} /> Browse
            </button>
            {user?.role === 'donor' && (
              <>
                <button
                  className={`nav-btn ${currentView === 'post' ? 'active' : ''}`}
                  onClick={() => setCurrentView('post')}
                >
                  <Package size={16} /> Post Food
                </button>
                <button
                  className={`nav-btn ${currentView === 'my-donations' ? 'active' : ''}`}
                  onClick={() => setCurrentView('my-donations')}
                >
                  <Heart size={16} /> My Donations
                </button>
              </>
            )}
            {user?.role !== 'donor' && (
              <button
                className={`nav-btn ${currentView === 'claimed' ? 'active' : ''}`}
                onClick={() => setCurrentView('claimed')}
              >
                <Users size={16} /> My Claims
              </button>
            )}
            <button className="nav-btn nav-btn-logout" onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </nav>
        </div>
      </header>

      {/* User Welcome Bar */}
      <div className="welcome-bar">
        <div className="welcome-content">
          <div className="welcome-user">
            <div className="user-avatar">
              <User size={20} />
            </div>
            <div className="user-info">
              <span className="user-greeting">Hello, {user?.name?.split(' ')[0]}!</span>
              <span className="user-org">{user?.organization || 'Individual'}</span>
            </div>
          </div>
          <div className="welcome-stats">
            <StatsCard icon={Utensils} label="Active Listings" value={listings.length} color="#38ef7d" />
            <StatsCard icon={Heart} label="Meals Saved" value={stats.meals} color="#f5576c" />
            <StatsCard icon={TrendingUp} label="CO₂ Reduced" value={`${(stats.meals * 0.42).toFixed(1)}kg`} color="#667eea" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner-large"></div>
            <span>Loading...</span>
          </div>
        )}

        {/* Listings View */}
        {currentView === 'listings' && !loading && (
          <>
            <div className="section-header">
              <h1 className="section-title">
                <Utensils size={28} /> Available Food
              </h1>
              <div className="section-filters">
                {FOOD_CATEGORIES.map(cat => (
                  <span key={cat.value} className="filter-chip" style={{ '--chip-color': cat.color }}>
                    <cat.icon size={14} /> {cat.label}
                  </span>
                ))}
              </div>
            </div>

            {listings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🍽️</div>
                <h3 className="empty-state-title">No food available right now</h3>
                <p>Check back later for new donations!</p>
                {user?.role === 'donor' && (
                  <button className="btn btn-primary" onClick={() => setCurrentView('post')}>
                    Post Food Donation
                  </button>
                )}
              </div>
            ) : (
              <div className="listings-grid">
                {listings.map(l => {
                  const timeInfo = formatTimeRemaining(l.expiry_time);
                  const category = getCategoryInfo(l.food_category);
                  const CategoryIcon = category.icon;

                  return (
                    <div key={l.id} className="listing-card">
                      <div className="listing-header" style={{ background: `linear-gradient(135deg, ${category.color}88, ${category.color}44)` }}>
                        <div className="listing-category">
                          <CategoryIcon size={16} />
                          <span>{category.label}</span>
                        </div>
                        <h3 className="listing-food-type">{l.food_type}</h3>
                        <div className="listing-quantity">{l.quantity}</div>
                      </div>
                      <div className="listing-body">
                        <p className="listing-description">{l.description || 'Fresh food available for pickup'}</p>
                        <div className="listing-donor">
                          <User size={14} />
                          <span>{l.donor_name || 'Anonymous Donor'}</span>
                        </div>
                        <div className="listing-meta">
                          <div className="listing-meta-item">
                            <MapPin size={14} />
                            <span>{l.address}</span>
                          </div>
                          <div className={`listing-meta-item ${timeInfo.urgent ? 'urgent' : ''}`}>
                            <Timer size={14} />
                            <span>{timeInfo.text}</span>
                          </div>
                          <div className="listing-meta-item">
                            <Phone size={14} />
                            <span>{l.contact}</span>
                          </div>
                        </div>
                      </div>
                      {user?.role !== 'donor' && (
                        <div className="listing-footer">
                          <button
                            className="claim-btn"
                            onClick={() => handleClaim(l.id)}
                            disabled={loading}
                          >
                            <Heart size={16} /> Claim This Food
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Post Food View */}
        {currentView === 'post' && !loading && (
          <div className="post-form-container">
            <h1 className="section-title">
              <Package size={28} /> Post Food Donation
            </h1>
            <div className="post-form-card">
              <PostFoodForm
                onSubmit={handlePostFood}
                userPhone={user?.phone}
                userAddress={user?.address}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* My Donations View (for donors) */}
        {currentView === 'my-donations' && !loading && (
          <>
            <h1 className="section-title">
              <Heart size={28} /> My Donations
            </h1>
            {myListings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <h3 className="empty-state-title">No donations yet</h3>
                <p>Start sharing surplus food with those in need!</p>
                <button className="btn btn-primary" onClick={() => setCurrentView('post')}>
                  Post Your First Donation
                </button>
              </div>
            ) : (
              <div className="listings-grid">
                {myListings.map(l => {
                  const timeInfo = formatTimeRemaining(l.expiry_time);
                  const category = getCategoryInfo(l.food_category);

                  return (
                    <div key={l.id} className="listing-card my-listing">
                      <div className="listing-status-badge" data-status={l.status}>
                        {l.status}
                      </div>
                      <div className="listing-header" style={{ background: `linear-gradient(135deg, ${category.color}88, ${category.color}44)` }}>
                        <h3 className="listing-food-type">{l.food_type}</h3>
                        <div className="listing-quantity">{l.quantity}</div>
                      </div>
                      <div className="listing-body">
                        <p className="listing-description">{l.description}</p>
                        <div className={`listing-meta-item ${timeInfo.urgent ? 'urgent' : ''}`}>
                          <Timer size={14} />
                          <span>{timeInfo.text}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Claims View */}
        {currentView === 'claimed' && !loading && (
          <>
            <h1 className="section-title">
              <Users size={28} /> My Claims
            </h1>
            {claims.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <h3 className="empty-state-title">No claims yet</h3>
                <p>Browse available food and make your first claim!</p>
                <button className="btn btn-primary" onClick={() => setCurrentView('listings')}>
                  Browse Available Food
                </button>
              </div>
            ) : (
              <div className="claims-list">
                {claims.map(c => (
                  <div key={c.id} className="claim-card">
                    <div className="claim-info">
                      <h4>{c.food_type}</h4>
                      <p className="text-muted">{c.address}</p>
                      <div className="claim-contact">
                        <Phone size={14} />
                        <span>{c.donor_phone}</span>
                      </div>
                    </div>
                    <span className={`claim-status ${c.status}`}>
                      {c.status === 'in-progress' ? 'Pending Pickup' : c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// --- ENHANCED POST FOOD FORM COMPONENT ---
const PostFoodForm = ({ onSubmit, userPhone, userAddress, loading }) => {
  const [formData, setFormData] = useState({
    food_type: '',
    quantity: '',
    description: '',
    address: userAddress || '',
    contact: userPhone || '',
    food_category: 'vegetarian',
    expiry_hours: 4
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (field, value) => {
    let error = null;
    switch (field) {
      case 'food_type':
        if (!value) error = 'Food type is required';
        break;
      case 'quantity':
        if (!value) error = 'Quantity/Servings is required';
        break;
      case 'address':
        if (!value) error = 'Address is required';
        else if (value.length < 5) error = 'Please enter a complete address';
        break;
      case 'contact':
        error = validatePhone(value);
        break;
      default:
        break;
    }
    setFormErrors(prev => ({ ...prev, [field]: error }));
    return error;
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = {
      food_type: validateField('food_type', formData.food_type),
      quantity: validateField('quantity', formData.quantity),
      address: validateField('address', formData.address),
      contact: validateField('contact', formData.contact)
    };

    setTouched({ food_type: true, quantity: true, address: true, contact: true });

    if (Object.values(errors).some(e => e !== null)) {
      return;
    }

    onSubmit(formData);
    setFormData({
      food_type: '',
      quantity: '',
      description: '',
      address: userAddress || '',
      contact: userPhone || '',
      food_category: 'vegetarian',
      expiry_hours: 4
    });
    setTouched({});
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Food Category Selection */}
      <div className="form-group">
        <label className="form-label">Food Category</label>
        <div className="category-selector">
          {FOOD_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              type="button"
              className={`category-option ${formData.food_category === cat.value ? 'selected' : ''}`}
              style={{ '--cat-color': cat.color }}
              onClick={() => handleInputChange('food_category', cat.value)}
            >
              <cat.icon size={20} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Food Type *</label>
        <input
          type="text"
          className={`form-input ${touched.food_type && formErrors.food_type ? 'error' : ''}`}
          placeholder="e.g., Dal Rice, Biryani, Sandwiches"
          value={formData.food_type}
          onChange={(e) => handleInputChange('food_type', e.target.value)}
          onBlur={() => handleBlur('food_type')}
        />
        {touched.food_type && formErrors.food_type && (
          <div className="error-message">
            <AlertCircle size={14} />
            {formErrors.food_type}
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Number of Servings *</label>
          <input
            type="text"
            className={`form-input ${touched.quantity && formErrors.quantity ? 'error' : ''}`}
            placeholder="e.g., 20 servings"
            value={formData.quantity}
            onChange={(e) => handleInputChange('quantity', e.target.value)}
            onBlur={() => handleBlur('quantity')}
          />
          {touched.quantity && formErrors.quantity && (
            <div className="error-message">
              <AlertCircle size={14} />
              {formErrors.quantity}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Available For</label>
          <select
            className="form-select"
            value={formData.expiry_hours}
            onChange={(e) => handleInputChange('expiry_hours', parseInt(e.target.value))}
          >
            <option value={1}>1 hour</option>
            <option value={2}>2 hours</option>
            <option value={4}>4 hours</option>
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-input form-textarea"
          placeholder="Ingredients, dietary info, special instructions..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Pickup Address *</label>
        <input
          type="text"
          className={`form-input ${touched.address && formErrors.address ? 'error' : ''}`}
          placeholder="Full pickup address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          onBlur={() => handleBlur('address')}
        />
        {touched.address && formErrors.address && (
          <div className="error-message">
            <AlertCircle size={14} />
            {formErrors.address}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Contact Number *</label>
        <input
          type="tel"
          className={`form-input ${touched.contact && formErrors.contact ? 'error' : ''}`}
          placeholder="+91 9876543210"
          value={formData.contact}
          onChange={(e) => handleInputChange('contact', e.target.value)}
          onBlur={() => handleBlur('contact')}
        />
        {touched.contact && formErrors.contact && (
          <div className="error-message">
            <AlertCircle size={14} />
            {formErrors.contact}
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-secondary btn-large" disabled={loading}>
        {loading ? (
          <span className="btn-loading">
            <span className="spinner"></span>
            Posting...
          </span>
        ) : (
          <>
            <Heart size={20} /> Post Food Donation
          </>
        )}
      </button>
    </form>
  );
};

export default App;
