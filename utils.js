const axios = require("axios")
const apiKey = 'cad7722e1ca44bd5f1ea46b59c8d54c8'
const tmdbURL = 'https://api.themoviedb.org/3'
const baseURL = 'https://xcine.click'
const { subscene } = require("node-subtitle-tools");
const jsdom = require("jsdom");

const parseURL = (url) => url.includes('https') ? url : url.replace('//', 'https://')

const isSeries = (title) => {
	return title.toLowerCase().includes('staffel')
}

const getTmdbDetail = async (id, isSeries) => {
	const tmdbRaw = await axios.get(`${tmdbURL}/${isSeries ? 'tv' : 'movie'}/${id}?api_key=${apiKey}&append_to_response=videos,images,credits,external_ids`)
	const tmdb = tmdbRaw.data
	return tmdb
}

const getMoviesData = (data) => {
	const link = data.getElementsByTagName('a')
	const titleElement = data.getElementsByClassName('movie-item__title')
	const imageElement = data.getElementsByTagName('img')
	const image = imageElement[0].getAttribute('src')
	const title = titleElement[0].textContent.trim()
	const tmdbImageId = image.split('/').pop().split('_').pop().split('.')[0]
	const series = isSeries(title)
	const movie = {
		'link': link[0].getAttribute('href'),
		'title': isSeries ? title.split(' - ')[0] : title,
		'tmdbImageId': tmdbImageId,
		'series': series,
	}

	return movie;
}

const getTmdb = async (movie) => {
	let tmdbRaw = await axios.get(`${tmdbURL}/search/${movie.series ? 'tv' : 'movie'}?query=${movie.title}&api_key=${apiKey}`)
	let tmdb = tmdbRaw.data
	let data = {}
	let genre = [];
	for (let i = 0; i < tmdb.results.length; i++) {
		let id = tmdb.results[i].id;
		let tmdbDetail = await getTmdbDetail(id, movie.series)

		const filter = tmdbDetail.images.posters.filter((item) => item.file_path.toLowerCase().includes(movie.tmdbImageId))
		if (filter.length > 0) {
			console.log(`FOUND ${movie.title}`)
			data = tmdbDetail
			break;
		}
	}
	movie['tmdb'] = data;
	return movie;
}

const getHome = async () => {
	const response = {}
	let [trendingMovies, trendingTv] = await Promise.all(
		[
			getTrendingMovies(),
			getTrendingTv()
		]
	);
	response['banner'] = trendingMovies.filter((item) => item.tmdb.name || item.tmdb.title)[0]
	response['trendingMovies'] = trendingMovies.filter((item) => item.tmdb.name || item.tmdb.title)
	response['trendingTv'] = trendingTv.filter((item) => item.tmdb.name || item.tmdb.title)
	return response;
}

const getSearch = async (keyword, page) => {
	let promise = []
	let movieList = []
	const raw = await axios.get(`${baseURL}/index.php?do=search&subaction=search&search_start=${page}&full_search=0&story=${keyword}`)
	const htmlRaw = raw.data
	const dom = new jsdom.JSDOM(htmlRaw);
	const selector = dom.window.document.querySelectorAll('.movie-item')

	for (let i = 0; i < selector.length; i++) {
		const movie = getMoviesData(selector[i])
		promise.push(getTmdb(movie))
	}
	movieList = await Promise.all(promise)
	return movieList.filter((item) => item.tmdb.name || item.tmdb.title);
}

const getGenre = async (genre, page) => {
	let promise = []
	let movieList = []
	const raw = await axios.get(`${baseURL}/${genre}/page/${page}/`)
	const htmlRaw = raw.data
	const dom = new jsdom.JSDOM(htmlRaw);
	const selector = dom.window.document.querySelectorAll('.movie-item')

	for (let i = 0; i < selector.length; i++) {
		const movie = getMoviesData(selector[i])
		promise.push(getTmdb(movie))
	}
	movieList = await Promise.all(promise)
	return movieList.filter((item) => item.tmdb.name || item.tmdb.title);
}

const getTrendingMovies = async () => {
	const raw = await axios.get(`${baseURL}/kinofilme-online/`);
	const htmlRaw = raw.data;
	let promise = []
	let movieList = []
	const dom = new jsdom.JSDOM(htmlRaw);
	const selector = dom.window.document.querySelectorAll('.movie-item')

	for (let i = 0; i < selector.length; i++) {
		const movie = getMoviesData(selector[i])
		promise.push(getTmdb(movie))
	}
	movieList = await Promise.all(promise)
	return movieList;
}

const getTrendingTv = async () => {
	const raw = await axios.get(`${baseURL}/serienstream-deutsch/`);
	const htmlRaw = raw.data;
	let promise = []
	let movieList = []
	const dom = new jsdom.JSDOM(htmlRaw);
	const selector = dom.window.document.querySelectorAll('.movie-item')

	for (let i = 0; i < selector.length; i++) {
		const movie = getMoviesData(selector[i])
		promise.push(getTmdb(movie))
	}
	movieList = await Promise.all(promise)
	return movieList;
}

const getEpisode = async (tmdbId, season) => {
	const response = await axios.get(`${tmdbURL}/tv/${tmdbId}/season/${season}?api_key=${apiKey}`);
	return response.data;
}

const getVideo = async (link, episode) => {
	const response = {}
	const raw = await axios.get(link)
	const data = raw.data
	const dom = new jsdom.JSDOM(data)

	if (episode) {
		const superVideoURL = dom.window.document.querySelectorAll('[data-link*=supervideo]')
		let epsURL = '';
		superVideoURL.forEach(element => {
			if (element.getAttribute('id').includes(`_${episode}`)) {
				epsURL = element.getAttribute('data-link')
			}
		});

		const superVideoURLRaw = await axios.get(parseURL(epsURL))
		const streamData = superVideoURLRaw.data
		const streamDom = new jsdom.JSDOM(streamData)

		const length = streamDom.window.document.querySelectorAll('[type*=javascript]').length - 1
		const evalData = streamDom.window.document.querySelectorAll('[type*=javascript]')[length].textContent.replace('eval', '')
		const result = `${eval(evalData)}`
		response['file'] = result.match(/(?<=file:")(.*)(?="}],image)/g)[0]
	} else {
		const superVideoURL = dom.window.document.querySelector('[data-link*=supervideo]').getAttribute('data-link')
		const superVideoURLRaw = await axios.get(parseURL(superVideoURL))
		const streamData = superVideoURLRaw.data
		const streamDom = new jsdom.JSDOM(streamData)

		const length = streamDom.window.document.querySelectorAll('[type*=javascript]').length - 1
		const evalData = streamDom.window.document.querySelectorAll('[type*=javascript]')[length].textContent.replace('eval', '')
		const result = `${eval(evalData)}`
		response['file'] = result.match(/(?<=file:")(.*)(?="}],image)/g)[0]
	}

	return response;
}

const getSubtitle = async (imdbId, path) => {
	let result = {}

	if (path) {
		const downloadedFiles = await subscene.downloadSubtitle(
			path,
			{
				unzip: true, //Unzip the subtitle
				convert: true, // Convert the subtitle to vtt
			}
		);

		let bufferOriginal = Buffer.from(downloadedFiles[0].buffer);
		result = bufferOriginal.toString('utf-8')
	} else {
		result = await subscene.getSubtitleByImdbId(
			imdbId, 
			apiKey,
			{
				language: ["en", "id"],
				rate: ['positive']
			}
		);
	}


	return result;

}

module.exports = { getHome, getSearch, getGenre, getVideo, getSubtitle, getEpisode }