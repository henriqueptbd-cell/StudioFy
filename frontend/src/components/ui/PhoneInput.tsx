import React from 'react';
import { Phone } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { maskPhone } from '@/utils/format';

interface PhoneInputProps {
    value: string;
    onChange: (masked: string, digits: string) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
    error?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    label = 'WhatsApp (com DDD)',
    placeholder = '(11) 91234-5678',
    required = true,
    error,
}) => {
    return (
        <Input
            label={label}
            inputMode="tel"
            placeholder={placeholder}
            autoComplete="tel"
            required={required}
            error={error}
            leftIcon={<Phone className="size-4" />}
            value={value}
            onChange={(e) => {
                const raw = e.target.value;
                const masked = maskPhone(raw);
                const digits = raw.replace(/\D/g, '');
                onChange(masked, digits);
            }}
        />
    );
};
