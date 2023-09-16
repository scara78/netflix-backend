const axios = require("axios")
const apiKey = 'cad7722e1ca44bd5f1ea46b59c8d54c8'
const baseURL = 'https://api.themoviedb.org/3'
const gDrive = 'https://api.gdriveplayer.us'
const genreList = require("./data/genre.json");
const banner = require("./data/banner.json");
const { subscene } = require("node-subtitle-tools");
const jsdom = require("jsdom");
const https = require('https')
const { AES, enc } = require("crypto-js");

const agent = new https.Agent({
	rejectUnauthorized: false,
})

const toTmdb = async (movie) => {
	try {
		let result = {}
		let genre = []
		let goMovies = await axios.post('https://gomovies.sx/ajax/search', { keyword: movie.title }, {
			headers: {
				"X-Requested-With": "XMLHttpRequest",
			},
			httpsAgent: agent
		});

		const dom = new jsdom.JSDOM(goMovies.data);
		const mediaElements = dom.window.document.querySelectorAll("a.nav-item");

		const path = mediaElements[0].getAttribute("href");

		let goMoviesId = path.split("-").pop().replace("/", "");

		if (goMoviesId.includes('javascript')) {
			throw Exception('no gomovies id');
		}

		let response = await axios.get(`${baseURL}/find/${movie.imdb}?api_key=${apiKey}&external_source=imdb_id`)
		let data = response.data
		try {
			result = data.movie_results[0]
			result.genre_ids.forEach((item) => {
				genre.push(genreList[item])
			})
			result['tmdb'] = result.id
			result['imdb'] = movie.imdb
			result['runtime'] = movie.runtime
			result['quality'] = movie.quality
			result['genre'] = genre;
			result['goMoviesId'] = goMoviesId;
			result['season'] = null;
			return result
		} catch {
			try {
				result = data.tv_results[0]
				result.genre_ids.forEach((item) => {
					genre.push(genreList[item])
				})
				result['genre'] = genre;
				result['tmdb'] = result.id
				result['imdb'] = movie.imdb
				result['runtime'] = movie.runtime
				result['quality'] = movie.quality
				result['genre'] = genre;
				result['goMoviesId'] = goMoviesId;
				result['season'] = parseInt(movie.detail.substring(movie.detail.lastIndexOf("/")).replaceAll('/season', ''))
				return result
			} catch (e) {

			}
		}
	} catch (e) {

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
	if (type == 'movie') {
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
	if (resMovie.data != null) {
		resMovie.data.forEach((item) => {
			promise.push(toTmdb(item))
		})
	}

	const resSeries = await axios.get(`${gDrive}/v2/series/search?title=${title}&limit=5&page=${page}`)
	if (resSeries.data != null) {
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
	if (resMovie.data != null) {
		resMovie.data.forEach((item) => {
			promise.push(toTmdb(item))
		})
	}

	const resSeries = await axios.get(`${gDrive}/v2/series/search?genre=${genre}&limit=5&page=${page}`)
	if (resSeries.data != null) {
		resSeries.data.forEach((item) => {
			promise.push(toTmdb(item))
		})
	}

	result = await Promise.all(promise)
	result = result.filter((item) => item);

	return result
}

const getNewest = async (page) => {
	let result = []
	const promise = []

	const resMovie = await axios.get(`${gDrive}/v1/movie/newest?limit=5&page=${page}`)
	if (resMovie.data != null) {
		resMovie.data.forEach((item) => {
			promise.push(toTmdb(item))
		})
	}

	const resSeries = await axios.get(`${gDrive}/v2/series/newest?limit=5&page=${page}`)
	if (resSeries.data != null) {
		resSeries.data.forEach((item) => {
			promise.push(toTmdb(item))
		})
	}

	result = await Promise.all(promise)
	result = result.filter((item) => item);

	return result
}

const getVideo = async (goMovieId, imdbId, season, episode) => {
	try {
		const response = {};
		let video;

		if (season) {
			let seasonData = await axios.get(`https://gomovies.sx/ajax/v2/tv/seasons/${goMovieId}`, {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
				},
				httpsAgent: agent
			});

			let dom = new jsdom.JSDOM(seasonData.data);
			const seasonsEl = dom.window.document.querySelectorAll(".ss-item");

			const seasonsData = [...seasonsEl].map((e) => ({
				number: e.innerHTML.replace("Season ", ""),
				dataId: e.getAttribute("data-id"),
			}));

			const targetSeason = seasonsData.find(
				(e) => e.number === season
			);

			if (!targetSeason) throw new Error("Season not found");

			let episodeData = await axios.get(`https://gomovies.sx/ajax/v2/season/episodes/${targetSeason.dataId}`, {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
				},
				httpsAgent: agent
			});

			dom = new jsdom.JSDOM(episodeData.data);
			const episodesEl = dom.window.document.querySelectorAll(".eps-item");

			const episodesData = Array.from(episodesEl).map((ep) => ({
				dataId: ep.getAttribute("data-id"),
				number: ep
					.querySelector("strong")
					.textContent.replace("Eps", "")
					.replace(":", "")
					.trim(),
			}));

			const targetEpisode = episodesData.find((ep) =>
				ep.number === episode
			);

			if (!targetEpisode.dataId) throw new Error("Episode not found");

			mediaId = targetEpisode.dataId;

			let source = await axios.get(`https://gomovies.sx/ajax/v2/episode/servers/${mediaId}`, {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
				},
				httpsAgent: agent
			});

			video = source

		} else {
			let source = await axios.get(`https://gomovies.sx/ajax/movie/episodes/${goMovieId}`, {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
				},
				httpsAgent: agent
			});

			video = source
		}

		if (video.data) {
			const dom = new jsdom.JSDOM(video.data);
			const upcloud = dom.window.document.querySelector(`a[title*="upcloud" i]`);
			const upcloudDataId =
				upcloud.getAttribute("data-id") ?? upcloud.getAttribute("data-linkid");

			if (!upcloudDataId) throw new Error("Upcloud source not available");

			let ress = await axios.get(`https://gomovies.sx/ajax/sources/${upcloudDataId}`, {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
				},
				httpsAgent: agent
			});

			video = ress.data

			const parsedUrl = new URL(video.link.replace("embed-5", "embed-4"));
			const dataPath = parsedUrl.pathname.split("/");
			const dataId = dataPath[dataPath.length - 1];

			const streamRes = await axios.get(`${parsedUrl.origin}/ajax/embed-4/getSources?id=${dataId}`, {
				headers: {
					Referer: parsedUrl.origin,
					"X-Requested-With": "XMLHttpRequest",
				},
			})

			video = streamRes.data

			if (video.sources) {
				let decryptionKey = await axios.get(`https://raw.githubusercontent.com/enimax-anime/key/e4/key.txt`)

				let extractedKey = "";
				const sourcesArray = video.sources.split("");
				for (const index of decryptionKey.data) {
					for (let i = index[0]; i < index[1]; i += 1) {
						extractedKey += video.sources[i];
						sourcesArray[i] = "";
					}
				}

				const decryptedStream = AES.decrypt(
					sourcesArray.join(""),
					extractedKey
				).toString(enc.Utf8);

				video = JSON.parse(decryptedStream)[0]
			}
		}

		try {
			const details = await subscene.getSubtitleByImdbId(
				imdbId,
				"cad7722e1ca44bd5f1ea46b59c8d54c8",
				{
					language: ["id"],
					rate: ['positive']
				}
			);

			const downloadedFiles = await subscene.downloadSubtitle(
				details["indonesian"][0].path,
				{
					unzip: true, //Unzip the subtitle
					convert: true, // Convert the subtitle to vtt
				}
			);

			let bufferOriginal = Buffer.from(downloadedFiles[0].buffer);
			response['subtitle'] = bufferOriginal.toString('utf-8')

		} catch (e) {
			response['subtitle'] = ''
		}

		response['data'] = video
		return response
	} catch {

	}
}

module.exports = { getHome, getDetail, getEpisode, getSearch, getGenre, getNewest, getVideo }