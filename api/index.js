const express = require('express')
const axios = require("axios")
const fs = require('fs')
const app = express()
const port = 3000
const path = require('path')
const utils = require('./../utils.js')
const shuffle = require('shuffle-array')

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

app.get('/api/video', async (req, res) => {
	const imdbId = req.query.imdbId
	const season = req.query.season
	const episode = req.query.episode
	const data = await utils.getVideo(imdbId, season, episode)
	res.send(data)
})

app.get('/api/subtitle', async (req, res) => {
	const title = req.query.title
	const path = req.query.path
	const subpath = req.query.subpath
	const data = await utils.getSubtitle(title, path, subpath)
	res.send(data)
})

module.exports = app;