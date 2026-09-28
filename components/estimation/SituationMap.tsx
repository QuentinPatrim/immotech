/* ============================================================
   PLAN DE SITUATION (avis de valeur, page « Le bien »)
   Tuiles cartographiques claires (CARTO, données OpenStreetMap)
   centrées sur l'adresse du bien, repère Patrim au centre.
   Simples images : s'impriment et se capturent comme le reste
   de la page (serveur de tuiles ouvert au partage CORS).
   ============================================================ */

const TILE = 256;
const SUBDOMAINS = ["a", "b", "c", "d"];

/** Coordonnées de tuile (fractionnaires) d'un point au niveau de zoom `z` */
function tileXY(lat: number, lon: number, z: number) {
    const n = 2 ** z;
    const rad = (lat * Math.PI) / 180;
    return {
        x: ((lon + 180) / 360) * n,
        y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
    };
}

export default function SituationMap({ lat, lon, zoom = 16, color = "#8a0e01" }: { lat: number; lon: number; zoom?: number; color?: string }) {
    const { x, y } = tileXY(lat, lon, zoom);
    const tx0 = Math.floor(x), ty0 = Math.floor(y);
    const tiles: { tx: number; ty: number }[] = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) tiles.push({ tx: tx0 + dx, ty: ty0 + dy });
    return (
        <div className="relative w-full h-full overflow-hidden bg-[#f2f1ed]">
            {tiles.map(({ tx, ty }) => (
                // eslint-disable-next-line @next/next/no-img-element -- tuiles cartographiques externes
                <img key={`${tx}-${ty}`} alt="" draggable={false}
                    src={`https://${SUBDOMAINS[(tx + ty) & 3]}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}@2x.png`}
                    className="absolute max-w-none select-none"
                    style={{ width: TILE, height: TILE, left: `calc(50% + ${(tx - x) * TILE}px)`, top: `calc(50% + ${(ty - y) * TILE}px)` }}/>
            ))}
            {/* Repère du bien */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92px] h-[92px] rounded-full" style={{ backgroundColor: color, opacity: 0.12 }}/>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46px] h-[46px] rounded-full" style={{ backgroundColor: color, opacity: 0.18 }}/>
                <span className="relative block w-[18px] h-[18px] rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]" style={{ backgroundColor: color }}/>
            </div>
            <span className="absolute right-2 bottom-1.5 text-[6.5px] text-[#6e6e73] bg-white/75 px-1.5 py-0.5 rounded">© OpenStreetMap · © CARTO</span>
        </div>
    );
}
