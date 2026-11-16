const yts = require('yt-search');
const https = require('https');

// Funzione di supporto per interrogare le API in modo nativo
function getJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error("Errore nel parsing JSON"));
                }
            });
        }).on('error', reject);
    });
}

module.exports = async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Query mancante' });
    }

    try {
        // Cerca il brano musicale su YouTube
        const searchResult = await yts(query + " audio");
        const videos = searchResult.videos;
        if (!videos || videos.length === 0) {
            return res.status(404).json({ error: 'Nessun video trovato' });
        }

        const videoId = videos[0].videoId;
        
        // Richiede i flussi audio reali dall'API di Piped
        const pipedData = await getJson(`https://pipedapi.kavin.rocks/streams/${videoId}`);
        
        if (!pipedData.audioStreams || pipedData.audioStreams.length === 0) {
            return res.status(404).json({ error: 'Flusso audio non disponibile' });
        }

        // Seleziona un formato audio compatibile (preferibilmente m4a/mp4 che Alexa digerisce benissimo)
        const audioStream = pipedData.audioStreams.find(s => s.mimeType && s.mimeType.includes('mp4')) || pipedData.audioStreams[0];

        return res.status(200).json({ 
            title: videos[0].title,
            audioUrl: audioStream.url 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Errore durante la ricerca', details: error.message });
    }
};
