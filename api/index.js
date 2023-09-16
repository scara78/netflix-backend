const express = require('express')
const axios = require("axios")
const fs = require('fs')
const app = express()
const port = 3000
const path = require('path')
const utils = require('./../utils.js')
const shuffle = require('shuffle-array')

app.get('/', async (req, res) => {
	res.send('server is running 🏃');
})

app.get("/api/player", async (req, res) => {
	const goMovieId = req.query.goMovieId
	const imdbId = req.query.imdbId
	const season = req.query.season
	const episode = req.query.episode
	const data = await utils.getVideo(goMovieId, imdbId, season, episode);
	res.send(data);
})

app.get("/api/home", async (req, res) => {
	const data = await utils.getHome();
	res.send(data)
})

app.get("/api/detail", async (req, res) => {
	const tmdb = req.query.tmdb
	const type = req.query.type
	const data = await utils.getDetail(tmdb, type);
	res.send(data)
})

app.get("/api/episode", async (req, res) => {
	const tmdb = req.query.tmdb
	const season = req.query.season
	const data = await utils.getEpisode(tmdb, season);
	res.send(data)
})

app.get("/api/search", async (req, res) => {
	try {
		const title = req.query.title
		const page = req.query.page
		const data = await utils.getSearch(title, page);
		res.send(shuffle(data))
	} catch {
		return res.send([])
	}
})

app.get("/api/genre", async (req, res) => {
	try {
		const genre = req.query.genre
		const page = req.query.page
		const data = await utils.getGenre(genre, page);
		res.send(shuffle(data))
	} catch {
		return res.send([])
	}
})

app.get("/api/newest", async (req, res) => {
	try {
		const page = req.query.page
		const data = await utils.getNewest(page);
		res.send(shuffle(data))
	} catch {
		return res.send([])
	}
})

module.exports = app;