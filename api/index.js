const express = require('express')
const app = express()
const utils = require('./../utils.js')

app.get('/', async (req, res) => {
	res.send('server is running 🏃');
})

app.get('/api/home', async (req, res) => {
	const data = await utils.getHome()
	res.send(data)
});

app.get('/api/search', async (req, res) => {
	const keyword = req.query.keyword
	const page = req.query.page
	const data = await utils.getSearch(keyword, page)
	res.send(data)
})

app.get('/api/genre', async (req, res) => {
	const genre = req.query.genre
	const page = req.query.page
	const data = await utils.getGenre(genre, page)
	res.send(data)
})

app.get('/api/episode', async (req, res) => {
	const tmdbId = req.query.tmdbId
	const season = req.query.season
	const data = await utils.getEpisode(tmdbId, season)
	res.send(data)
})

app.get('/api/video', async (req, res) => {
	const link = req.query.link
	const episode = req.query.episode
	const data = await utils.getVideo(link, episode)
	res.send(data)
})

app.get('/api/subtitle', async (req, res) => {
	const imdbId = req.query.imdb
	const path = req.query.path
	const data = await utils.getSubtitle(imdbId, path)
	res.send(data)
})

module.exports = app;