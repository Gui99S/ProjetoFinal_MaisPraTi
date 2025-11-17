import React from 'react';
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

import placeholder1 from "../assets/images/placeholder1.png";
import devAvatar from "../assets/images/img0.png";

// Dados da equipe
const teamMembers = [
  {
    id: 1,
    name: "Guilherme Santos",
    icon: devAvatar,
    technologies: ["React", "FastAPI", "PostgreSQL", "Docker"],
    github: "https://github.com/Gui99S",
    portfolio: "https://gui99s.github.io/Portfolio-v0.4/"
  }
];

// Componente individual do card
const DevCard = ({ member }) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const isDark = theme === 'dark';
  
  // Safety check for member prop
  if (!member) {
    return (
      <div className="dev-card" style={{ 
        padding: "2rem",
        borderRadius: "12px",
        backgroundColor: "var(--bg-secondary)",
        textAlign: "center",
        border: "1px solid var(--border-light)",
        maxWidth: "350px",
        color: "var(--text-primary)",
      }}>
        <p>No member data available</p>
      </div>
    );
  }
  
  return (
    <div className="dev-card"
      style={{ 
        padding: "2rem",
        borderRadius: "12px",
        backgroundColor: "var(--bg-secondary)",
        textAlign: "center",
        border: "1px solid var(--border-light)",
        maxWidth: "350px",
        color: "var(--text-primary)",
      }}>
      <div className="dev-card__avatar"
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "var(--bg-tertiary)",
          margin: "0 auto 1rem auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2rem",
        }}>
        <img src={member.icon} alt={member.name} style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
        }} />
      </div>
      
      <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem" }}>
        {member.name}
      </h4>
      
      <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", opacity: "0.8", borderBottom: "1px solid var(--text-secondary)", whiteSpace: "nowrap" }}>
        {translate('devCard.role')} | <a 
          href={member.github} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            color: "var(--btn-primary)",
            textDecoration: "none",
          }}
          onMouseOver={(e) => {
            e.target.style.textDecoration = "underline";
          }}
          onMouseOut={(e) => {
            e.target.style.textDecoration = "none";
          }}
        >
          {translate('devCard.github')}
        </a> | <a 
          href={member.portfolio} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            color: "var(--btn-primary)",
            textDecoration: "none",
          }}
          onMouseOver={(e) => {
            e.target.style.textDecoration = "underline";
          }}
          onMouseOut={(e) => {
            e.target.style.textDecoration = "none";
          }}
        >
          {translate('devCard.portfolio')}
        </a> | <a 
          href="#" /* url: /profile/guilherme-santos */ 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            color: "var(--btn-primary)",
            textDecoration: "none",
          }}
          onMouseOver={(e) => {
            e.target.style.textDecoration = "underline";
          }}
          onMouseOut={(e) => {
            e.target.style.textDecoration = "none";
          }}
        >
          {translate('devCard.profile')}
        </a>
      </p>
      
      <p style={{ 
        fontSize: "0.9rem", 
        lineHeight: "1.5", 
        textAlign: "justify"
      }}>
        {translate('devCard.description')}
      </p>
      
      <div style={{ marginTop: "1rem" }}>
        {member.technologies.map((tech, index) => (
          <span 
            key={index}
            style={{ 
              backgroundColor: "var(--bg-tertiary)", 
              color: "var(--text-primary)",
              padding: "0.3rem 0.6rem", 
              borderRadius: "15px", 
              fontSize: "0.8rem",
              margin: "0.2rem",
              display: "inline-block"
            }}
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
};

// Componente principal DevCards
const DevCards = () => {
  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center",
      gap: "2rem" 
    }}>
      {teamMembers.map((member) => (
        <DevCard key={member.id} member={member} />
      ))}
    </div>
  );
};

export default DevCards;
export { DevCard, teamMembers };