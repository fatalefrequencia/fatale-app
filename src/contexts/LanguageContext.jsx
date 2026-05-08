import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../translations/en';
import es from '../translations/es';

const translations = { en, es };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('preferred_language') || 'en';
    });

    useEffect(() => {
        localStorage.setItem('preferred_language', language);
    }, [language]);

    const t = (key) => {
        return translations[language]?.[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
