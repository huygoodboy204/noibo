import React, { createContext, useContext, useState } from 'react';

type ModalLayoutContextType = {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
};

const ModalLayoutContext = createContext<ModalLayoutContextType | undefined>(undefined);

export const ModalLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ModalLayoutContext.Provider value={{ isModalOpen, setIsModalOpen }}>
      {children}
    </ModalLayoutContext.Provider>
  );
};

export const useModalLayout = () => {
  const context = useContext(ModalLayoutContext);
  if (context === undefined) {
    throw new Error('useModalLayout must be used within a ModalLayoutProvider');
  }
  return context;
}; 