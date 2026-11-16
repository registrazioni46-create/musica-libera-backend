
const yts = require('yt-search');
const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            timeout: 3000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        }, (res) => {
            let data = '';

            res.on('data', chunk => data += chunk);

            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

module.exports = async (req, res) => {
    const query = req.query.q || 'musica';

    // Audio demo per verificare il funzionamento di Alexa
    let audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    let title = "Musica Libera - Traccia di Test";

    try {
        const searchResult = await yts(query + " audio");

        if (searchResult && searchResult.videos && searchResult.videos.length > 0) {

            title = searchResult.videos[0].title;
            const videoId = searchResult.videos[0].videoId;

            // Prova a recuperare lo stream audio da Piped
            try {
                const pipedData = await fetchJson(
                    `https://pipedapi.kavin.rocks/streams/${videoId}`
                );

                if (pipedData && pipedData.audioStreams && pipedData.audioStreams.length > 0) {

                    const stream = pipedData.audioStreams.find(s => s.url);

                    if (stream && stream.url) {
                        audioUrl = stream.url;
                    }
                }

            } catch (e) {
                // Registra l'errore Piped nei log di Vercel
                console.error("ERRORE PIPED:", e.message || e);
            }
        }

    } catch (error) {
        // Registra eventuali errori nella ricerca YouTube
        console.error("ERRORE RICERCA YOUTUBE:", error.message || error);
    }

    return res.status(200).json({
        title: title,
        audioUrl: audioUrl
    });
};
