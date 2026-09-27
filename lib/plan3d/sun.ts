/* ============================================================
   PLAN 3D — SOLEIL
   Position du soleil (azimut, hauteur) pour un lieu et une heure
   (formules simplifiées de la NOAA, précision ~1° : largement
   suffisante pour l'éclairage), puis direction dans le repère du
   plan selon son orientation (cap du haut du plan).
   ============================================================ */

import type { Pt } from "@/lib/plan3d/types";

const rad = Math.PI / 180;

/** Toulouse par défaut (pas d'adresse géocodée) */
export const DEFAULT_GEO = { lat: 43.6, lng: 1.44 };

export interface SunPosition {
    /** Azimut (degrés, sens horaire depuis le nord) */
    azimuth: number;
    /** Hauteur au-dessus de l'horizon (degrés, négative la nuit) */
    altitude: number;
}

/** Position du soleil à la date donnée (instant absolu) pour une latitude / longitude */
export function sunPosition(date: Date, lat: number, lng: number): SunPosition {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const t = (jd - 2451545) / 36525;
    const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
    const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    const c = Math.sin(m * rad) * (1.914602 - t * (0.004817 + 0.000014 * t))
        + Math.sin(2 * m * rad) * (0.019993 - 0.000101 * t) + Math.sin(3 * m * rad) * 0.000289;
    const trueLong = l0 + c;
    const omega = 125.04 - 1934.136 * t;
    const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
    const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(omega * rad);
    const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad));
    const y = Math.tan((eps / 2) * rad) ** 2;
    const eqTime = 4 / rad * (y * Math.sin(2 * l0 * rad) - 2 * e * Math.sin(m * rad)
        + 4 * e * y * Math.sin(m * rad) * Math.cos(2 * l0 * rad)
        - 0.5 * y * y * Math.sin(4 * l0 * rad) - 1.25 * e * e * Math.sin(2 * m * rad));
    const minutesUtc = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    const trueSolar = (minutesUtc + eqTime + 4 * lng + 1440) % 1440;
    let hourAngle = trueSolar / 4 - 180;
    if (hourAngle < -180) hourAngle += 360;
    const phi = lat * rad, h = hourAngle * rad;
    const cosZen = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(h);
    const zen = Math.acos(Math.max(-1, Math.min(1, cosZen)));
    const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi));
    return { azimuth: (az / rad + 180 + 360) % 360, altitude: 90 - zen / rad };
}

/**
 * Date locale française du jour, à l'heure décimale voulue (14.5 = 14 h 30).
 * Décalage horaire de Paris (été / hiver) approché par la date.
 */
export function localDate(hour: number, base = new Date()): Date {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
    const month = base.getUTCMonth();
    const summer = month > 2 && month < 10; // fin mars → fin octobre, approché
    d.setUTCMinutes(Math.round((hour - (summer ? 2 : 1)) * 60));
    return d;
}

/**
 * Direction dans le repère du plan (x droite, y bas) d'un cap géographique,
 * le haut du plan ayant le cap `north`.
 */
export function planDirection(bearing: number, north = 0): Pt {
    const a = (bearing - north) * rad;
    return { x: Math.sin(a), y: -Math.cos(a) };
}

/** Points cardinaux pour l'affichage d'une orientation */
export function cardinal(bearing: number): string {
    const names = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ouest", "Ouest", "Nord-Ouest"];
    return names[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}
