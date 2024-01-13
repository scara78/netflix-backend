const axios = require("axios")
const apiKey = 'cad7722e1ca44bd5f1ea46b59c8d54c8'
const tmdbURL = 'https://api.themoviedb.org/3'
const baseURL = 'https://api.gdriveplayer.us'
const { subscene } = require("node-subtitle-tools");
const CryptoJS = require("crypto-js");
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

var pass = "alsfheafsjklNIWORNiolNIOWNKLNXakjsfwnBdwjbwfkjbJjkopfjweopjASoiwnrflakefneiofrt";



function unPack(code) {
	function indent(code) {
		try {
			var tabs = 0, old = -1, add = '';
			for (var i = 0; i < code.length; i++) {
				if (code[i].indexOf("{") != -1) tabs++;
				if (code[i].indexOf("}") != -1) tabs--;
				if (old != tabs) {
					old = tabs;
					add = "";
					while (old > 0) {
						add += "\t";
						old--;
					}
					old = tabs;
				}
				code[i] = add + code[i];
			}
		} finally {
			tabs = null;
			old = null;
			add = null;
		}
		return code;
	}

	var env = {
		eval: function (c) {
			code = c;
		},
		window: {},
		document: {}
	};
	eval("with(env) {" + code + "}");
	return code;
}

var CryptoJSAesJson = {
	stringify: function (cipherParams) {
		var j = {
			ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
		};
		if (cipherParams.iv) j.iv = cipherParams.iv.toString();
		if (cipherParams.salt) j.s = cipherParams.salt.toString();
		return JSON.stringify(j);
	},
	parse: function (jsonStr) {
		var j = JSON.parse(jsonStr);
		var cipherParams = CryptoJS.lib.CipherParams.create({
			ciphertext: CryptoJS.enc.Base64.parse(j.ct)
		});
		if (j.iv) cipherParams.iv = CryptoJS.enc.Hex.parse(j.iv)
		if (j.s) cipherParams.salt = CryptoJS.enc.Hex.parse(j.s)
		return cipherParams;
	}

}

// const getMoviesData = (data) => {
// 	const link = data.getElementsByTagName('a')
// 	const titleElement = data.getElementsByClassName('movie-item__title')
// 	const imageElement = data.getElementsByTagName('img')
// 	const image = imageElement[0].getAttribute('src')
// 	const title = titleElement[0].textContent.trim()
// 	const tmdbImageId = image.split('/').pop().split('_').pop().split('.')[0]
// 	const series = isSeries(title)
// 	const movie = {
// 		'link': link[0].getAttribute('href'),
// 		'title': isSeries ? title.split(' - ')[0] : title,
// 		'tmdbImageId': tmdbImageId,
// 		'series': series,
// 	}

// 	return movie;
// }

const getTmdb = async (movie) => {
	let tmdbRaw = await axios.get(`${tmdbURL}/find/${movie.imdb}?external_source=imdb_id&api_key=${apiKey}`)
	let tmdb = tmdbRaw.data
	let found = (movie.series) ? tmdb.tv_results[0] : tmdb.movie_results[0]
	let id = found.id;
	let data = await getTmdbDetail(id, movie.series)

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
	response['banner'] = trendingMovies[0]
	response['trendingMovies'] = trendingMovies
	response['trendingTv'] = trendingTv
	return response;
}

const getSearch = async (keyword, page) => {
	let promise = []
	let movieList = []

	const rawMovie = await axios.get(`${baseURL}/v1/movie/search?title=${keyword}&page=${page}`)
	const dataMovie = rawMovie.data

	const rawSeries = await axios.get(`${baseURL}/v2/series/search?title=${keyword}&page=${page}`)
	const dataSeries = rawSeries.data

	for (let i = 0; i < dataMovie ?? [].length; i++) {
		const movie = dataMovie[i];
		movie['series'] = false;
		promise.push(getTmdb(movie).catch((e) => { }))
	}

	for (let i = 0; i < dataSeries ?? [].length; i++) {
		const movie = dataSeries[i];
		movie['series'] = true;
		promise.push(getTmdb(movie).catch((e) => { }))
	}

	movieList = await Promise.all(promise)
	return movieList.filter((item) => item != null);
}

const getGenre = async (genre, page) => {
	const raw = await axios.get(`${baseURL}/v1/movie/search?genre=${genre}&page=${page}`)
	const data = raw.data;
	let promise = []
	let movieList = []

	for (let i = 0; i < data.length; i++) {
		const movie = data[i];
		movie['series'] = false;
		promise.push(getTmdb(movie).catch((e) => { }))
	}
	movieList = await Promise.all(promise)
	return movieList.filter((item) => item != null);
}

const getTrendingMovies = async () => {
	const raw = await axios.get(`${baseURL}/v1/movie/newest`);
	const data = raw.data;
	let promise = []
	let movieList = []

	for (let i = 0; i < data.length; i++) {
		const movie = data[i];
		movie['series'] = false;
		promise.push(getTmdb(movie).catch((e) => { }))
	}
	movieList = await Promise.all(promise)
	return movieList.filter((item) => item != null);
}

const getTrendingTv = async () => {
	const raw = await axios.get(`${baseURL}/v2/series/newest`);
	const data = raw.data;
	let promise = []
	let movieList = []

	for (let i = 0; i < data.length; i++) {
		const movie = data[i];
		movie['series'] = true;
		promise.push(getTmdb(movie).catch((e) => { }))
	}
	movieList = await Promise.all(promise)
	return movieList.filter((item) => item != null);
}

const getEpisode = async (tmdbId, season) => {
	const response = await axios.get(`${tmdbURL}/tv/${tmdbId}/season/${season}?api_key=${apiKey}`);
	return response.data;
}

const getLink = async (imdbId, season, episode) => {
	let result = []
	let raw;
	if (season) {
		raw = await axios.get(`https://databasegdriveplayer.xyz/player.php?type=series&imdb=${imdbId}&season=${season}&episode=${episode}`, {
			headers: {
				'Referer': 'https://database.gdriveplayer.us',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
			}
		})

		const htmlRaw = raw.data
		const dom = new jsdom.JSDOM(htmlRaw)
		const selector = dom.window.document.querySelectorAll('script')
		const firstEval = selector[11].textContent
		const firstEvalResult = unPack(firstEval)

		data = firstEvalResult.match(/(?<=data=')(.*)(?=';\[)/g)[0]

		const secondEval = JSON.parse(CryptoJS.AES.decrypt(data, pass, {
			format: CryptoJSAesJson
		}).toString(CryptoJS.enc.Utf8));

		const secondEvalResult = unPack(secondEval)
		let fileArray = secondEvalResult.match(/(?<=sources:)(.*)(?=,image)/)[0]
		fileArray = fileArray.replaceAll('"+Date.now()+"', + new Date())
		fileArray = fileArray.replaceAll('"+encodeURI(document.referrer)+"', + '')
		const sources = JSON.parse(fileArray)
		return sources.map((it) => {
			let url;

			if(it.file.substring(0, 5).includes('hls')) {
				url = `https://databasegdriveplayer.xyz/${it.file}`
			} else {
				url = `https:${it.file}`
			}

			return {
				'file': url,
				'label': `${it.label}`,
				'tyoe': `${it.type},`
			}
		})
	} else {
		raw = await axios.get(`https://databasegdriveplayer.xyz/player.php?imdb=${imdbId}`, {
			headers: {
				'Referer': 'https://database.gdriveplayer.us',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
			}
		})
		const htmlRaw = raw.data
		const dom = new jsdom.JSDOM(htmlRaw);
		const token = dom.window.document.getElementById('token').textContent
		result.push({ 'file': `https://databasegdriveplayer.xyz/hlsplaylist.php?idhls=${token}.m3u8`, 'label': '720p', 'type': 'mp4' })
		return result;
	}
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

module.exports = { getHome, getSearch, getGenre, getLink, getSubtitle, getEpisode }