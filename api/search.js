const yts = require('yt-search');
const https = require('https');

const INVIDIOUS_INSTANCES = [
    'inv.nadeko.net',
    'invidious.nerdvpn.de',
    'invidious.f5.si',
    'yt.artemislena.eu'
];

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Status ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

module.exports = async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Inserisci ?q=nome_canzone nell URL' });
    }

    try {
        const searchResult = await yts(query + " audio");
        const videos = searchResult.videos;
        if (!videos || videos.length === 0) {
            return res.status(404).json({ error: 'Nessun video trovato' });
        }

        const videoId = videos[0].videoId;
        let audioUrl = null;

        // Prova le istanze Invidious in sequenza finché una risponde con lo stream M4A
        for (const host of INVIDIOUS_INSTANCES) {
            try {
                const data = await fetchJson(`https://${host}/api/v1/videos/${videoId}`);
                if (data && data.adaptiveFormats) {
                    // Cerca formato solo audio mp4/m4a (l'unico compatibile al 100% con Alexa)
                    const m4a = data.adaptiveFormats.find(f => f.type && f.type.includes('audio/mp4'));
                    if (m4a && m4a.url) {
                        audioUrl = m4a.url;
                        break;
                    }
                }
            } catch (e) {
                continue; // Passa al server successivo se questo è lento o bloccato
            }
        }

        if (!audioUrl) {
            return res.status(502).json({ error: 'Nessuno stream audio compatibile disponibile al momento' });
        }

        return res.status(200).json({
            title: videos[0].title,
            audioUrl: audioUrl
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
