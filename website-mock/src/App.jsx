import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import ServicesPage from './pages/ServicesPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import CareersPage from './pages/CareersPage';
import NrbPage from './pages/NrbPage';
import { AppraisalModal, InspectionModal, AuthModal } from './components/Modals';

export default function App() {
  const [appraisalModalOpen, setAppraisalModalOpen] = useState(false);
  const [appraisalService, setAppraisalService] = useState(null);
  const [inspectionModalData, setInspectionModalData] = useState(null);
  const [authModalData, setAuthModalData] = useState(null); // { isOpen: boolean, role: 'client' | 'provider' }

  const handleOpenAppraisal = (serviceName) => {
    setAppraisalService(serviceName || null);
    setAppraisalModalOpen(true);
  };

  const handleBookInspection = (property, timeSlot) => {
    setInspectionModalData({ property, timeSlot });
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-[#012a4e] flex flex-col selection:bg-[#00AEEF] selection:text-white font-sans">
        
        {/* Top Navigation: Clean, Minimalist with Hamburger Drawer & Top-Right Pill CTA */}
        <Navbar 
          onOpenAppraisal={() => handleOpenAppraisal()}
        />

        {/* Dynamic Route View */}
        <main className="flex-1">
          <Routes>
            <Route 
              path="/" 
              element={
                <HomePage 
                  onOpenAppraisal={handleOpenAppraisal} 
                  onBookInspection={handleBookInspection} 
                />
              } 
            />
            <Route 
              path="/properties" 
              element={
                <PropertiesPage 
                  onBookInspection={handleBookInspection} 
                />
              } 
            />
            <Route 
              path="/properties/:id" 
              element={
                <PropertyDetailPage 
                  onBookInspection={handleBookInspection} 
                />
              } 
            />
            <Route 
              path="/services" 
              element={
                <ServicesPage 
                  onOpenAppraisal={handleOpenAppraisal} 
                />
              } 
            />
            <Route 
              path="/about" 
              element={
                <AboutPage 
                  onOpenAppraisal={handleOpenAppraisal} 
                />
              } 
            />
            <Route 
              path="/contact" 
              element={<ContactPage />} 
            />
            <Route 
              path="/careers" 
              element={<CareersPage />} 
            />
            <Route 
              path="/nrb" 
              element={
                <NrbPage 
                  onOpenAppraisal={handleOpenAppraisal} 
                />
              } 
            />
          </Routes>
        </main>

        {/* Footer: Contains Client Login & Service Provider Login (No admin login) */}
        <Footer 
          onOpenAppraisal={() => handleOpenAppraisal()}
          onOpenAuth={(role) => setAuthModalData({ isOpen: true, role })}
        />

        {/* Global Modals */}
        <AppraisalModal 
          isOpen={appraisalModalOpen}
          initialService={appraisalService}
          onClose={() => {
            setAppraisalModalOpen(false);
            setAppraisalService(null);
          }}
        />

        {inspectionModalData && (
          <InspectionModal 
            isOpen={!!inspectionModalData}
            property={inspectionModalData.property}
            initialSlot={inspectionModalData.timeSlot}
            onClose={() => setInspectionModalData(null)}
          />
        )}

        {authModalData?.isOpen && (
          <AuthModal 
            isOpen={authModalData.isOpen}
            initialRole={authModalData.role}
            onClose={() => setAuthModalData(null)}
          />
        )}

      </div>
    </BrowserRouter>
  );
}
