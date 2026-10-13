import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, BookOpen, AlertCircle, Loader2 } from 'lucide-react';

const AuthPage = () => {
  const { login, register, confirmRegistration, resendCode } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'confirm'
  const [pendingEmail, setPendingEmail] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearMessages = () => { setError(''); setSuccessMsg(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        setPendingEmail(email);
        setMode('confirm');
      }
    } catch (err) {
      const msg = err.message || 'Login failed.';
      if (msg.includes('User is not confirmed')) {
        setPendingEmail(email);
        setMode('confirm');
        setError('Your email is not confirmed. Enter the verification code.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!name || !email || !password) { setError('All fields are required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const result = await register(name, email, password);
      if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        setPendingEmail(email);
        setMode('confirm');
        setSuccessMsg('Account created! Check your email for the verification code.');
      } else {
        setSuccessMsg('Account created! You can now sign in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!confirmCode) { setError('Please enter the confirmation code.'); return; }
    setLoading(true);
    try {
      await confirmRegistration(pendingEmail, confirmCode);
      setSuccessMsg('Email confirmed! Signing you in…');
      // Sign in after confirmation
      await login(pendingEmail, password);
    } catch (err) {
      setError(err.message || 'Confirmation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    clearMessages();
    try {
      await resendCode(pendingEmail);
      setSuccessMsg('A new code has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    }
  };

  const Logo = () => (
    <div className="auth-logo">
      <div className="auth-logo-icon">
        <BookOpen size={22} />
      </div>
      <span className="auth-logo-text">Cloud Notes</span>
    </div>
  );

  if (mode === 'confirm') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <Logo />
          <h1 className="auth-title">Verify your email</h1>
          <p className="auth-subtitle">We sent a code to <strong>{pendingEmail}</strong></p>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              <AlertCircle size={16} />{error}
            </div>
          )}
          {successMsg && (
            <div className="alert alert-success" style={{ marginBottom: '20px' }}>
              {successMsg}
            </div>
          )}
          <form className="auth-form" onSubmit={handleConfirm}>
            <div className="form-group">
              <label htmlFor="confirm-code">Verification Code</label>
              <input
                id="confirm-code"
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                autoFocus
              />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Verifying…</> : 'Verify Email'}
            </button>
          </form>
          <div className="auth-switch">
            Didn't get a code?{' '}
            <a onClick={handleResend}>Resend code</a>
          </div>
          <div className="auth-switch" style={{ marginTop: '8px' }}>
            <a onClick={() => { clearMessages(); setMode('login'); }}>← Back to sign in</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo />
        <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to your Cloud Notes account.'
            : 'Start managing your notes in the cloud.'}
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} />{error}
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            {successMsg}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
          noValidate
        >
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
                  <User size={16} />
                </span>
                <input
                  id="auth-name"
                  className="input"
                  style={{ paddingLeft: 38 }}
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
                <Mail size={16} />
              </span>
              <input
                id="auth-email"
                className="input"
                style={{ paddingLeft: 38 }}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
                <Lock size={16} />
              </span>
              <input
                id="auth-password"
                className="input"
                style={{ paddingLeft: 38, paddingRight: 40 }}
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'login' ? 'Your password' : 'Min 8 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? (
              <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <a onClick={() => { clearMessages(); setMode('register'); }}>Sign up</a></>
          ) : (
            <>Already have an account? <a onClick={() => { clearMessages(); setMode('login'); }}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
