const axios = require("axios")
const apiKey = 'cad7722e1ca44bd5f1ea46b59c8d54c8'
const baseURL = 'https://api.themoviedb.org/3'
const gDrive = 'https://api.gdriveplayer.us'
const genreList = require("./data/genre.json");
const banner = require("./data/banner.json");

const toTmdb = async (movie) => {
	let result = {}
	let genre = []
	let response = await axios.get(`${baseURL}/find/${movie.imdb}?api_key=${apiKey}&external_source=imdb_id`)
	let data = response.data
	try {
		result = data.movie_results[0]
		result.genre_ids.forEach((item) => {
			genre.push(genreList[item])
		})
		result['imdb'] = movie.imdb
		result['runtime'] = movie.runtime
		result['quality'] = movie.quality
		result['genre'] = genre;
		result['season'] = null;
		return result
	} catch {
		try {
			result = data.tv_results[0]
			result.genre_ids.forEach((item) => {
				genre.push(genreList[item])
			})
			result['genre'] = genre;
			result['imdb'] = movie.imdb
			result['runtime'] = movie.runtime
			result['quality'] = movie.quality
			result['genre'] = genre;
			result['season'] = parseInt(movie.detail.substring(movie.detail.lastIndexOf("/")).replaceAll('/season', ''))
			return result	
		} catch (e) {
			
		}
	}
}

const getHome = async () => {
	const response = {}
	let data
	let tmdb
	let promise = []

	//banner
	data = banner
	tmdb = await toTmdb(data)
	response['banner'] = tmdb

	//action
	const action = await axios.get(`${gDrive}/v1/movie/search?genre=action`)
	data = action.data
	data.forEach((item) => {
		promise.push(toTmdb(item))
	})
	response['action'] = await Promise.all(promise)
	response['action'] = response['action'].filter((item) => item)
	promise = []

	//romance
	const romance = await axios.get(`${gDrive}/v1/movie/search?genre=romance`)
	data = romance.data
	data.forEach((item) => {
		promise.push(toTmdb(item))
	})
	response['romance'] = await Promise.all(promise)
	response['romance'] = response['romance'].filter((item) => item)
	promise = []

	// series
	const series = await axios.get(`${gDrive}/v2/series/newest`)
	data = series.data
	data.forEach((item) => {
		promise.push(toTmdb(item))
	})

	response['series'] = await Promise.all(promise)
	response['series'] = response['series'].filter((item) => item)
	return response
}

const getDetail = async (tmdb, type) => {
	if(type == 'movie') {
		let response = await axios.get(`${baseURL}/movie/${tmdb}?api_key=${apiKey}&append_to_response=videos,images,credits`)
		return response.data
	} else {
		let response = await axios.get(`${baseURL}/tv/${tmdb}?api_key=${apiKey}&append_to_response=videos,images,credits`)
		return response.data
	}
}

const getEpisode = async (tmdb, season) => {	
	let response = await axios.get(`${baseURL}/tv/${tmdb}/season/${season}?api_key=${apiKey}`)
	return response.data
}

const getSearch = async (title, page) => {
	let result = []
	const promise = []

	const resMovie = await axios.get(`${gDrive}/v1/movie/search?title=${title}&limit=5&page=${page}`)
	if(resMovie.data != null) {
		resMovie.data.forEach((item) => {
			promise.push(toTmdb(item))
		})
	}

	const resSeries = await axios.get(`${gDrive}/v2/series/search?title=${title}&limit=5&page=${page}`)
	if(resSeries.data != null) {
		resSeries.data.forEach((item) => {
			promise.push(toTmdb(item))
		})
	}

	result = await Promise.all(promise)
	result = result.filter((item) => item);

	return result
}

const getGenre = async (genre, page) => {
	let result = []
	const promise = []

	const resMovie = await axios.get(`${gDrive}/v1/movie/search?genre=${genre}&limit=5&page=${page}`)
	if(resMovie.data != null) {
		resMovie.data.forEach((item) => {
			promise.push(toTmdb(item))
		})
	}

	const resSeries = await axios.get(`${gDrive}/v2/series/search?genre=${genre}&limit=5&page=${page}`)
	if(resSeries.data != null) {
		resSeries.data.forEach((item) => {
			promise.push(toTmdb(item))
		})
	}

	result = await Promise.all(promise)
	result = result.filter((item) => item);

	return result
}

module.exports = { getHome, getDetail, getEpisode, getSearch, getGenre }