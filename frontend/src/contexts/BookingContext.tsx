import React, { createContext, useCallback, useContext, useState } from 'react';
import { Service, TenantPublicData } from '@/types';

export interface BookingConfirmation {
  serviceName: string;
  dateTimeLabel: string;
  customerName: string;
  tenantPhone?: string | null;
  status: 'PENDENTE' | 'CONFIRMADO';
  id?: string;
  serviceId?: string;
}

interface BookingContextData {
  tenant: TenantPublicData | null;
  slug: string;
  /** Datas/horários selecionados, persistidos entre os passos do fluxo. */
  service: Service | null;
  date: string | null; // 'YYYY-MM-DD'
  time: string | null; // 'HH:mm'
  customer: { name: string; phone: string };
  confirmation: BookingConfirmation | null;
  setService: (service: Service) => void;
  setDate: (date: string) => void;
  setTime: (time: string | null) => void;
  setCustomer: (customer: { name: string; phone: string }) => void;
  setConfirmation: (confirmation: BookingConfirmation) => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextData>({} as BookingContextData);

interface BookingProviderProps {
  tenant: TenantPublicData;
  slug: string;
  children: React.ReactNode;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({ tenant, slug, children }) => {
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const reset = useCallback(() => {
    setService(null);
    setDate(null);
    setTime(null);
    setCustomer({ name: '', phone: '' });
    setConfirmation(null);
  }, []);

  return (
    <BookingContext.Provider
      value={{
        tenant,
        slug,
        service,
        date,
        time,
        customer,
        confirmation,
        setService,
        setDate,
        setTime,
        setCustomer,
        setConfirmation,
        reset,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
