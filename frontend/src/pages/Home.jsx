import React, { useState } from 'react'
import { useUser } from '../context/UserContext'
import { useLanguage } from '../context/LanguageContext'
import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { login, register, loading } = useUser();
  const { translate } = useLanguage();
  const navigate = useNavigate();

  // Sliding animation logic
  const isActive = !isLogin;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (errorMessage) setErrorMessage('');
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isLogin) {
      // Login
      if (!formData.email || !formData.password) {
        setErrorMessage(translate('validation.fillAllFields'));
        return;
      }

      const result = await login({
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        navigate('/feed');
      } else {
        setErrorMessage(result.error);
      }
    } else {
      // Register
      if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
        setErrorMessage(translate('validation.fillAllFields'));
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMessage(translate('validation.passwordsMismatch'));
        return;
      }
      if (formData.password.length < 6) {
        setErrorMessage(translate('validation.passwordTooShort'));
        return;
      }

      const result = await register({
        name: formData.fullName,
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        // Show success message
        setSuccessMessage(translate('home.accountCreated'));
        // Clear form
        setFormData({
          fullName: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        // Switch to login form after a short delay
        setTimeout(() => {
          setIsLogin(true);
          setSuccessMessage('');
        }, 3000);
      } else {
        setErrorMessage(result.error);
      }
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    // Login with demo credentials
    const result = await login({
      email: 'test@example.com',
      password: 'test123'
    });

    if (result.success) {
      navigate('/feed');
    } else {
      setErrorMessage(result.error || translate('home.demoLoginFailed'));
    }
  };

  return (
    <>
      {errorMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#f44336',
          color: 'white',
          padding: '15px 30px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '15px 30px',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {successMessage}
        </div>
      )}
      <div 
        className={`container ${isActive ? 'active' : ''}`}
        style={{
          position: 'absolute',
          top: 'calc(50% + 20px)',
          left: '50%',
          marginBottom: '20px',
          transform: 'translate(-50%, -50%)'
        }}>
        {/* Login Form */}
        <div className="form-box login">
          <form onSubmit={handleSubmit}>
            <h2>{translate('home.login')}</h2>
            <div className="input-box">
              <input type="email" name="email" placeholder={translate('home.email')} required maxLength={40} value={formData.email} onChange={handleInputChange}/>
              <i className="fa-solid fa-envelope"></i>
            </div>
            <div className="input-box">
              <input type="password" name="password" placeholder={translate('home.password')} required value={formData.password} onChange={handleInputChange}/>
              <i className="fa-solid fa-lock"></i>
            </div>
            <div className="forgot-link">
              <a href="#">{translate('home.forgotPassword')}</a>
            </div>
            <button type="submit" className="btn btn-login" disabled={loading}>
              {loading ? translate('home.loggingIn') : translate('home.login')}
            </button>
            
            {/* Mobile toggle */}
            <div style={{ display: 'none' }} className="mobile-toggle">
              <p>{translate('home.noAccount')} <button type="button" className="btn" onClick={() => setIsLogin(false)}>{translate('home.register')}</button></p>
              <p>or try our <button type="button" className="btn" onClick={handleDemoLogin}>{translate('home.demo')}</button></p>
            </div>

            <p>{translate('home.orLoginWith')}</p>
            <div className="social-icons">
              <a href="#"><i className="fa-brands fa-google"></i></a>
              <a href="#"><i className="fa-brands fa-facebook"></i></a>
              <a href="#"><i className="fa-brands fa-github"></i></a>
              <a href="#"><i className="fa-brands fa-linkedin-in"></i></a>
            </div>
          </form>
        </div>

        {/* Register Form */}
        <div className="form-box register">
          <form onSubmit={handleSubmit}>
            <h2>{translate('home.register')}</h2>
            <div className="input-box">
              <input type="text" name="fullName" placeholder={translate('home.fullName')} required maxLength={40} value={formData.fullName} onChange={handleInputChange}/>
              <i className="fa-solid fa-user"></i>
            </div>
            <div className="input-box">
              <input type="email" name="email" placeholder={translate('home.email')} required maxLength={40} value={formData.email} onChange={handleInputChange}/>
              <i className="fa-solid fa-envelope"></i>
            </div>
            <div className="input-box">
              <input type="password" name="password" placeholder={translate('home.password')} required value={formData.password} onChange={handleInputChange}/>
              <i className="fa-solid fa-lock"></i>
            </div>
            <div className="input-box">
              <input type="password" name="confirmPassword" placeholder={translate('home.confirmPassword')} required value={formData.confirmPassword} onChange={handleInputChange}/>
              <i className="fa-solid fa-lock"></i>
            </div>
            <button type="submit" className="btn btn-register" disabled={loading}>
              {loading ? translate('home.registering') : translate('home.register')}
            </button>
            
            {/* Mobile toggle */}
            <div style={{ display: 'none' }} className="mobile-toggle">
              <p>{translate('home.alreadyHaveAccount')} <button type="button" className="btn" onClick={() => setIsLogin(true)}>{translate('home.login')}</button></p>
            </div>

            <p>{translate('home.orRegisterWith')}</p>
            <div className="social-icons">
              <a href="#"><i className="fa-brands fa-google"></i></a>
              <a href="#"><i className="fa-brands fa-facebook"></i></a>
              <a href="#"><i className="fa-brands fa-github"></i></a>
              <a href="#"><i className="fa-brands fa-linkedin-in"></i></a>
            </div>
          </form>
        </div>
        
        <div className="toggle-box">
          {/* Toggle Box Left */}
          <div className="toggle-panel toggle-left ">
            <h2>{translate('home.helloWelcome')}</h2>
            <p style={{ padding: '8px' }}>{translate('home.noAccountRegister')}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn register-btn" type="button" onClick={() => setIsLogin(false)}>{translate('home.register')}</button>
              <button className="btn demo-btn" type="button" onClick={handleDemoLogin}>{translate('home.demo')}</button>
            </div>
          </div>

          {/* Toggle Box Right */}
          <div className="toggle-panel toggle-right ">
            <h2>{translate('home.welcomeBackTitle')}</h2>
            <p>{translate('home.alreadyHaveAccount')}</p>
            <button className="btn login-btn" type="button" onClick={() => setIsLogin(true)}>{translate('home.login')}</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Home;