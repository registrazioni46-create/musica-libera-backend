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

        const videoId = videos[0].videoId;
        const audioUrl = `https://piped.video/latest/stream?id=${videoId}`;

        return res.status(200).json({ 
            title: videos[0].title,
            audioUrl: audioUrl 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Errore durante la ricerca', details: error.message });
    }
};
