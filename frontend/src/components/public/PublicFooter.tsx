import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const PublicFooter: React.FC = () => (
    <footer className="mt-12 border-t border-zinc-200/60 py-6 text-center">
        <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 underline underline-offset-4 transition hover:text-zinc-600"
        >
            Área do Estabelecimento <ArrowRight className="size-3" />
        </Link>
    </footer>
);
