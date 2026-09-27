/* ============================================================
   PLAN 3D — MODÈLE DE DONNÉES
   Un plan est un ensemble de pièces (polygones en mètres, repère
   du plan : x vers la droite, y vers le bas, origine en haut à
   gauche), d'ouvertures (portes, fenêtres) posées sur les côtés
   des pièces, et de meubles. Il est stocké dans le dossier
   (data_json.plan3d) et rendu en 3D (three.js).
   ============================================================ */

/** Point en mètres, repère du plan (x → droite, y → bas) */
export interface Pt { x: number; y: number }

export type RoomKind =
    | "sejour" | "cuisine" | "chambre" | "sdb" | "wc" | "entree" | "couloir"
    | "bureau" | "dressing" | "cellier" | "buanderie" | "balcon" | "terrasse" | "jardin" | "autre";

export const ROOM_KINDS: { id: RoomKind; label: string }[] = [
    { id: "sejour", label: "Séjour" },
    { id: "cuisine", label: "Cuisine" },
    { id: "chambre", label: "Chambre" },
    { id: "sdb", label: "Salle d'eau / bain" },
    { id: "wc", label: "WC" },
    { id: "entree", label: "Entrée" },
    { id: "couloir", label: "Dégagement" },
    { id: "bureau", label: "Bureau" },
    { id: "dressing", label: "Dressing" },
    { id: "cellier", label: "Cellier / rangement" },
    { id: "buanderie", label: "Buanderie" },
    { id: "balcon", label: "Balcon" },
    { id: "jardin", label: "Jardin" },
    { id: "terrasse", label: "Terrasse" },
    { id: "autre", label: "Autre" },
];

/** Pièces extérieures : pas de murs pleins (garde-corps), non comptées dans la surface habitable */
export const OUTDOOR_KINDS: RoomKind[] = ["balcon", "terrasse", "jardin"];

export interface Room {
    id: string;
    name: string;
    kind: RoomKind;
    /** Contour dans le sens horaire ou anti-horaire, ≥ 3 points, en mètres */
    polygon: Pt[];
    /**
     * Surface de référence (m²) : tableau du DDT, surfaces saisies. Tant qu'elle
     * est posée, la pièce la garde quand on déplace ses murs (les autres murs se recalent).
     */
    targetArea?: number;
}

export type OpeningKind = "door" | "window" | "french";

/**
 * Ouverture posée sur un côté d'une pièce :
 * côté `edge` = segment polygon[edge] → polygon[(edge + 1) % n],
 * centrée à la fraction `t` (0..1) de ce segment, largeur `width` en mètres.
 */
export interface Opening {
    id: string;
    kind: OpeningKind;
    roomId: string;
    edge: number;
    t: number;
    width: number;
}

export type FurnitureType =
    | "sofa" | "armchair" | "coffee_table" | "tv_unit" | "rug" | "dining_table" | "chair"
    | "bed_double" | "bed_single" | "nightstand" | "wardrobe" | "desk" | "office_chair" | "bookshelf"
    | "kitchen_run" | "kitchen_island" | "fridge" | "bathtub" | "shower" | "vanity" | "toilet"
    | "washer" | "plant" | "floor_lamp" | "outdoor_table" | "lounger" | "console" | "sideboard";

/** Meuble posé au sol : centre (x, y) en mètres, rotation en radians autour de l'axe vertical */
export interface Furniture {
    id: string;
    type: FurnitureType;
    roomId?: string;
    x: number;
    y: number;
    rotation: number;
    /** Dimensions au sol (w le long de l'axe local x, d le long de l'axe local y) et hauteur, en mètres */
    w: number;
    d: number;
    h: number;
    /** Modèle réaliste choisi dans la bibliothèque (identifiant) ; sinon choix automatique */
    model?: string;
}

export type StyleId = "scandinave" | "contemporain" | "haussmannien" | "industriel";

export interface Plan3D {
    version: 1;
    /** Plan 2D d'origine (image) et correspondance avec le repère en mètres */
    source?: {
        imageUrl: string;
        /** Pixels de l'image d'origine par mètre */
        pxPerMeter: number;
        widthPx: number;
        heightPx: number;
        /** Position de l'origine du repère (0, 0) dans l'image, en pixels */
        originPx: Pt;
    } | null;
    /** Hauteur sous plafond (m) */
    wallHeight: number;
    rooms: Room[];
    openings: Opening[];
    furniture: Furniture[];
    style: StyleId;
    /** Plan schématique généré à partir des seules surfaces (pas de plan 2D fourni) */
    schematic?: boolean;
    /** Surfaces de référence verrouillées à l'édition (vrai par défaut quand elles existent) */
    lockAreas?: boolean;
    /**
     * Orientation : cap (degrés, sens horaire depuis le nord) du haut du plan.
     * 0 = le haut du plan regarde le nord ; 90 = l'est. Sert au soleil et à la vue extérieure.
     */
    north?: number;
    /** Position du bien (géocodage de l'adresse) */
    geo?: { lat: number; lng: number };
    updatedAt?: string;
}

export const DEFAULT_WALL_HEIGHT = 2.5;

/** Mur calculé à partir des pièces (côtés partagés fusionnés) */
export interface Wall {
    a: Pt;
    b: Pt;
    /** Mur extérieur (un seul côté bordé par une pièce) ou cloison intérieure */
    exterior: boolean;
    thickness: number;
    /** Garde-corps bas (côté extérieur d'un balcon / d'une terrasse) */
    railing: boolean;
    /** Bordure de jardin : haie plutôt que garde-corps */
    hedge?: boolean;
    /** Ouvertures sur ce mur, positions exprimées en mètres depuis `a` le long du mur */
    openings: { kind: OpeningKind; from: number; to: number; id: string }[];
}

/** Réponse de /api/plan3d/extract */
export interface ExtractResponse {
    success: boolean;
    plan?: Plan3D;
    /** Surfaces lues sur le plan, total calculé, avertissements lisibles par l'agent */
    notes?: string[];
    error?: string;
}
