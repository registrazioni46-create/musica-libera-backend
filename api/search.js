const yts = require('yt-search');
const https = require('https');

const INVIDIOUS_INSTANCES = [
    'invidious.nerdvpn.de',
    'inv.nadeko.net',
    'yt.artemislena.eu'
];

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 4000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Se riceve HTML o errore HTTP, scarta subito
                if (res.statusCode !== 200 || data.trim().startsWith('<')) {
                    return reject(new Error('Risposta non valida'));
                }
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Errore nel parsing JSON'));
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
        return res.status(400).json({ error: 'Query mancante (usa ?q=testo)' });
    }

    try {
        const searchResult = await yts(query + " audio");
        const videos = searchResult.videos;
        if (!videos || videos.length === 0) {
            return res.status(404).json({ error: 'Nessun video trovato' });
        }

        const videoId = videos[0].videoId;
        let audioUrl = null;

        for (const host of INVIDIOUS_INSTANCES) {
            try {
                const data = await fetchJson(`https://${host}/api/v1/videos/${videoId}`);
                if (data && data.adaptiveFormats) {
                    const m4a = data.adaptiveFormats.find(f => f.type && f.type.includes('audio/mp4'));
                    if (m4a && m4a.url) {
                        audioUrl = m4a.url;
                        break;
                    }
                }
            } catch (e) {
                continue; // Passa al server successivo se questo fallisce
            }
        }

        if (!audioUrl) {
            return res.status(502).json({ error: 'Stream audio non disponibile' });
        }

        return res.status(200).json({
            title: videos[0].title,
            audioUrl: audioUrl
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
