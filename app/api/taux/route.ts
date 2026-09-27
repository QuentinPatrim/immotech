/* ============================================================
   API : GET /api/taux
   Taux des crédits immobiliers en France, source publique :
   BCE — MFI Interest Rate Statistics (MIR), sans clé d'API.
   - nominal : nouveaux crédits habitat, taux fixe > 10 ans
   - TAEG   : nouveaux crédits habitat, coût total (APRC)
   Taux d'usure : variable USURY_RATE si renseignée (valeur
   Banque de France du trimestre), sinon estimé par la règle
   légale (TAEG moyen + 1/3). Mis en cache 12 h.
   ============================================================ */

import { NextResponse } from "next/server";
import { FALLBACK_RATES, buildGrid, type Rates } from "@/lib/financing";

export const revalidate = 43200;

const ECB = "https://data-api.ecb.europa.eu/service/data/MIR";
const SERIES = {
    nominal: "M.FR.B.A2C.P.R.A.2250.EUR.N",
    aprc: "M.FR.B.A2C.A.C.A.2250.EUR.N",
};

async function lastObservation(key: string): Promise<{ period: string; value: number } | null> {
    try {
        const res = await fetch(`${ECB}/${key}?lastNObservations=1&format=csvdata`, { next: { revalidate }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const [header, ...rows] = (await res.text()).trim().split(/\r?\n/);
        const cols = header.split(",");
        const iP = cols.indexOf("TIME_PERIOD"), iV = cols.indexOf("OBS_VALUE");
        const last = rows[rows.length - 1]?.split(",");
        const value = last ? parseFloat(last[iV]) : NaN;
        return last && isFinite(value) ? { period: last[iP], value } : null;
    } catch {
        return null;
    }
}

export async function GET() {
    const [nominal, aprc] = await Promise.all([lastObservation(SERIES.nominal), lastObservation(SERIES.aprc)]);
    const envUsury = parseFloat(process.env.USURY_RATE || "");
    const base = nominal?.value ?? FALLBACK_RATES.nominal;
    const aprcValue = aprc?.value ?? FALLBACK_RATES.aprc;
    const rates: Rates = {
        period: nominal?.period ?? FALLBACK_RATES.period,
        nominal: base,
        aprc: aprcValue,
        grid: buildGrid(base),
        usury: isFinite(envUsury) && envUsury > 0 ? envUsury : +(aprcValue * 4 / 3).toFixed(2),
        usuryEstimated: !(isFinite(envUsury) && envUsury > 0),
        live: !!nominal,
    };
    return NextResponse.json(rates, { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } });
}
