import React from 'react';
import { Phone } from 'lucide-react';
import type { TenantPublicData } from '@/types';
import { BrandMark } from '@/components/ui/BrandMark';

export const PublicHeader: React.FC<{ tenant: TenantPublicData }> = ({ tenant }) => {
    return (
        <header className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                {tenant.logoUrl ? (
                    <img
                        src={tenant.logoUrl}
                        alt={tenant.name}
                        className="size-12 rounded-2xl object-cover"
                    />
                ) : (
                    <BrandMark color={tenant.primaryColor} />
                )}
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold tracking-tight text-zinc-950">
                            {tenant.name}
                        </h1>
                        <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                    {tenant.phone && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                            <Phone className="size-3" /> {tenant.phone}
                        </p>
                    )}
                </div>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-emerald-700">
                ABERTO HOJE
            </span>
        </header>
    );
};
