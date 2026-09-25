import sharp from 'sharp';
import { extensionBackground, extensionBridge, extensionIconSvg, extensionManifest, EXTENSION_VERSION } from '@/lib/captureExtension';

/* ============================================================
   API : /api/extension
   Télécharge l'extension Chrome « Patrim – Capture d'annonces »
   (fichier .zip à décompresser puis charger dans Chrome), réglée
   sur l'adresse du site qui la distribue.
   ============================================================ */

// --- ZIP minimal (fichiers stockés sans compression) ---
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf: Buffer) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function zip(files: { name: string; data: Buffer }[]) {
    const locals: Buffer[] = [];
    const centrals: Buffer[] = [];
    let offset = 0;
    for (const f of files) {
        const name = Buffer.from(f.name, 'utf8');
        const crc = crc32(f.data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);            // version
        local.writeUInt16LE(0x0800, 6);        // noms en UTF-8
        local.writeUInt16LE(0, 8);             // stocké
        local.writeUInt32LE(0, 10);            // date/heure
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(f.data.length, 18);
        local.writeUInt32LE(f.data.length, 22);
        local.writeUInt16LE(name.length, 26);
        local.writeUInt16LE(0, 28);
        locals.push(local, name, f.data);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(0, 10);
        central.writeUInt32LE(0, 12);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(f.data.length, 20);
        central.writeUInt32LE(f.data.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(offset, 42);
        centrals.push(central, name);
        offset += 30 + name.length + f.data.length;
    }
    const centralSize = centrals.reduce((s, b) => s + b.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, ...centrals, end]);
}

export async function GET(request: Request) {
    const origin = new URL(request.url).origin;
    const icons = await Promise.all([16, 48, 128].map(async size => ({
        name: `patrim-capture/icons/icon${size}.png`,
        data: await sharp(Buffer.from(extensionIconSvg(size))).resize(size, size).png().toBuffer(),
    })));
    const archive = zip([
        { name: 'patrim-capture/manifest.json', data: Buffer.from(JSON.stringify(extensionManifest(origin), null, 2)) },
        { name: 'patrim-capture/background.js', data: Buffer.from(extensionBackground(origin)) },
        { name: 'patrim-capture/bridge.js', data: Buffer.from(extensionBridge()) },
        ...icons,
    ]);
    return new Response(new Uint8Array(archive), {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="patrim-capture-${EXTENSION_VERSION}.zip"`,
            'Cache-Control': 'no-store',
        },
    });
}
