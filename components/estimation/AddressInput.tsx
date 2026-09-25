"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchAddresses, type AddressSuggestion } from "@/lib/addressClient";

/* ============================================================
   Champ adresse avec suggestions (Base Adresse Nationale)
   Taper 3 caractères → suggestions ; ↑ ↓ Entrée pour choisir.
   ============================================================ */

interface AddressInputProps {
    value: string;
    onChange: (text: string) => void;
    onSelect: (suggestion: AddressSuggestion) => void;
    placeholder?: string;
    className?: string;
    near?: { lat?: number; lon?: number } | null;
    autoFocus?: boolean;
}

export default function AddressInput({ value, onChange, onSelect, placeholder, className, near, autoFocus }: AddressInputProps) {
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(-1);
    const typedRef = useRef(false); // on ne cherche que lorsque l'utilisateur tape (pas au chargement)
    const nearRef = useRef(near);
    useEffect(() => { nearRef.current = near; }, [near]);

    useEffect(() => {
        if (!typedRef.current) return;
        const q = value.trim();
        if (q.length < 3) return;
        const controller = new AbortController();
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const list = await searchAddresses(q, nearRef.current, controller.signal);
                setSuggestions(list);
                setActive(list.length ? 0 : -1);
                setOpen(list.length > 0);
            } catch { /* requête annulée ou hors ligne : on garde la saisie libre */ }
            finally { if (!controller.signal.aborted) setLoading(false); }
        }, 220);
        return () => { clearTimeout(t); controller.abort(); };
    }, [value]);

    const choose = (s: AddressSuggestion) => {
        typedRef.current = false;
        setOpen(false);
        setSuggestions([]);
        onSelect(s);
    };

    return (
        <div className="relative">
            <Input
                value={value}
                autoFocus={autoFocus}
                autoComplete="off"
                onChange={e => {
                    typedRef.current = true;
                    if (e.target.value.trim().length < 3) { setSuggestions([]); setOpen(false); }
                    onChange(e.target.value);
                }}
                onFocus={() => { if (suggestions.length) setOpen(true); }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={e => {
                    if (!open || !suggestions.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => (a + 1) % suggestions.length); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => (a - 1 + suggestions.length) % suggestions.length); }
                    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(suggestions[active]); }
                    else if (e.key === "Escape") setOpen(false);
                }}
                className={className}
                placeholder={placeholder}
            />
            {loading && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[var(--p-muted)]"/>}
            {open && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-[var(--p-line-strong)] bg-[var(--p-card)] shadow-2xl overflow-hidden">
                    {suggestions.map((s, i) => (
                        <button
                            key={`${s.label}-${i}`}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); choose(s); }}
                            onMouseEnter={() => setActive(i)}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${i === active ? "bg-[var(--p-hover)] text-[var(--p-fg)]" : "text-[var(--p-fg-2)]"}`}>
                            <MapPin size={14} className="shrink-0 text-[#d35f52]"/>
                            <span className="truncate">{s.label}</span>
                        </button>
                    ))}
                    <p className="px-4 py-1.5 text-[10px] text-[var(--p-faint)] border-t border-[var(--p-line)]">Base Adresse Nationale · IGN</p>
                </div>
            )}
        </div>
    );
}
