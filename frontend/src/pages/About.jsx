import React from 'react'
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import DevCards from '../components/DevCard';
import './About.css';

function About() {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const [activeTab, setActiveTab] = useState('about');
  
  const isDark = theme === 'dark';

  return (
    <div className="page">
      <main className="main main-standard">
        <section className={`section section-${activeTab}`} style={{ marginTop: "-105.5px"  }}>
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              onClick={() => setActiveTab('about')}
              className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
            >
              {translate('about.tabs.about')}
            </button>
            <button 
              onClick={() => setActiveTab('services')}
              className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
            >
              {translate('about.tabs.services')}
            </button>
            <button 
              onClick={() => setActiveTab('team')}
              className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
            >
              {translate('about.tabs.team')}
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content" style={{ border: 'none', backgroundColor: 'var(--bg-primary)' }}>
            {activeTab === 'about' && (
              <div className="about-content">
                <h3>{translate('about.aboutUs')}</h3>
                <p style={{ textAlign: 'justify' }}>{translate('about.description1')}</p>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="services-content">
                <h3>{translate('about.ourServices')}</h3>
                <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
                  <li>{translate('about.service1')}</li>
                  <li>{translate('about.service2')}</li>
                  <li>{translate('about.service3')}</li>
                  <li>{translate('about.service4')}</li>
                </ul>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="team-category">
                <DevCards category="fullstack" />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default About
