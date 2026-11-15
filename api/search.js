const ytdl = require('ytdl-core');
const yts = require('yt-search');

module.exports = async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Query mancante' });
    }

    try {
        const searchResult = await yts(query);
        const videos = searchResult.videos;
        if (!videos || videos.length === 0) {
            return res.status(404).json({ error: 'Nessun video trovato' });
        }

        const videoUrl = videos[0].url;
        const info = await ytdl.getInfo(videoUrl);
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        
        if (audioFormats.length === 0) {
            return res.status(500).json({ error: 'Formato audio non disponibile' });
        }

        return res.status(200).json({ audioUrl: audioFormats[0].url });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Errore durante l\'estrazione' });
    }
};
