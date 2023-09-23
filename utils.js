const axios = require("axios")
const apiKey = 'cad7722e1ca44bd5f1ea46b59c8d54c8'
const tmdbURL = 'https://api.themoviedb.org/3'
const baseURL = 'https://hurawatch.stream'
const vidURL = 'https://vidsrc.to'
const { subscene } = require("node-subtitle-tools");
const jsdom = require("jsdom");
const vm = require('vm')
const key = '8z5Ag5wgagfsOuhz'

const getId = (link) => {
	return link.getAttribute('href').split('-').pop().replace('/', '')
}

const isSeries = (link) => {
	return link.getAttribute('href').includes('series')
}

const getTmdbDetail = async (id, isSeries) => {
	const tmdbRaw = await axios.get(`${tmdbURL}/${isSeries ? 'tv' : 'movie'}/${id}?api_key=${apiKey}&append_to_response=videos,images,credits,external_ids`)
	const tmdb = tmdbRaw.data
	return tmdb
}

const getMoviesData = (data) => {
	const link = data.getElementsByTagName('a')
	const titleElement = data.getElementsByClassName('film-name')
	const imageElement = data.getElementsByTagName('img')
	const image = imageElement[0].getAttribute('src')
	const id = getId(link[0])
	const title = titleElement[0].textContent.trim()
	const tmdbImageId = image.split('/').pop().split('.')[0]
	const series = isSeries(link[0])
	const movie = {
		'id': id,
		'link': link[0].getAttribute('href').split('/')[link[0].getAttribute('href').split('/').length - 2],
		'title': title,
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

		if (movie.isBanner) {
			const filter = tmdbDetail.images.backdrops.filter((item) => item.file_path.includes(movie.tmdbImageId))
			if (filter.length > 0) {
				console.log(`FOUND ${movie.title}`)
				data = tmdbDetail
				break;
			}
		} else {
			const filter = tmdbDetail.images.posters.filter((item) => item.file_path.includes(movie.tmdbImageId))
			if (filter.length > 0) {
				console.log(`FOUND ${movie.title}`)
				data = tmdbDetail
				break;
			}
		}
	}
	movie['tmdb'] = data;
	return movie;
}

const getHome = async () => {
	const response = {}
	const raw = await axios.get(`${baseURL}/home`);
	let [banner, trendingMovies, trendingTv] = await Promise.all(
		[
			getBanner(raw.data),
			getTrendingMovies(raw.data),
			getTrendingTv(raw.data)
		]
	);
	response['banner'] = banner
	response['trendingMovies'] = trendingMovies
	response['trendingTv'] = trendingTv
	return response;
}

const getSearch = async (keyword, page) => {
	let promise = []
	let movieList = []
	const raw = await axios.get(`${baseURL}/search/${keyword}/page/${page}/`)
	const htmlRaw = raw.data
	const dom = new jsdom.JSDOM(htmlRaw);
	const selector = dom.window.document.querySelectorAll('.flw-item')

	for (let i = 0; i < selector.length; i++) {
		const movie = getMoviesData(selector[i])
		promise.push(getTmdb(movie))
	}
	movieList = await Promise.all(promise)
	return movieList;
}

const getGenre = async (genre, page) => {
	let promise = []
	let movieList = []
	const raw = await axios.get(`${baseURL}/genre/${genre}/page/${page}/`)
	const htmlRaw = raw.data
	const dom = new jsdom.JSDOM(htmlRaw);
	const selector = dom.window.document.querySelectorAll('.flw-item')

	for (let i = 0; i < selector.length; i++) {
		const movie = getMoviesData(selector[i])
		promise.push(getTmdb(movie))
	}
	movieList = await Promise.all(promise)
	return movieList;
}


const getBanner = async (htmlRaw) => {
	const movie = {}
	const dom = new jsdom.JSDOM(htmlRaw);
	const selector = dom.window.document.querySelector('.swiper-slide')
	const link = selector.getElementsByTagName('a')
	const image = selector.style.backgroundImage
	const titleElement = selector.getElementsByClassName('film-title')
	const id = getId(link[0])
	const tmdbImageId = image.replace('(', '').replace(')', '').split('/').pop().split('.')[0]
	const title = titleElement[0].textContent.trim()
	const series = isSeries(link[0])
	movie['id'] = id
	movie['link'] = link[0].getAttribute('href').split('/')[link[0].getAttribute('href').split('/').length - 2],
		movie['tmdbImageId'] = tmdbImageId
	movie['title'] = title
	movie['isBanner'] = true
	movie['series'] = series
	return getTmdb(movie);
}

const getTrendingMovies = async (htmlRaw) => {
	let promise = []
	let movieList = []
	const dom = new jsdom.JSDOM(htmlRaw);
	const selector = dom.window.document.querySelectorAll('div#trending-movies .flw-item')

	for (let i = 0; i < selector.length; i++) {
		const movie = getMoviesData(selector[i])
		promise.push(getTmdb(movie))
	}
	movieList = await Promise.all(promise)
	return movieList;
}

const getTrendingTv = async (htmlRaw) => {
	let promise = []
	let movieList = []
	const dom = new jsdom.JSDOM(htmlRaw);
	const selector = dom.window.document.querySelectorAll('div#trending-tv .flw-item')

	for (let i = 0; i < selector.length; i++) {
		const movie = getMoviesData(selector[i])
		promise.push(getTmdb(movie))
	}
	movieList = await Promise.all(promise)
	return movieList;
}

const getVideo = async (imdbId, season, episode) => {
	const response = {}
	let raw = '';

	if (season) {
		raw = await axios.get(`${vidURL}/embed/tv/${imdbId}/${season}/${episode}`)
	} else {
		raw = await axios.get(`${vidURL}/embed/movie/${imdbId}`)
	}

	raw = raw.data
	const dom = new jsdom.JSDOM(raw);

	const dataId = dom.window.document.querySelector('a[data-id]').getAttribute('data-id');
	const sources = await axios.get(`${vidURL}/ajax/embed/episode/${dataId}/sources`);
	const sourcesData = sources.data.result.filter((item) => item.title == 'Filemoon')[0];
	const encryptedUrl = await axios.get(`${vidURL}/ajax/embed/source/${sourcesData.id}`);
	const fileMoonURL = decryptSourceUrl(encryptedUrl.data.result.url);

	const url = fileMoonURL;
	const res = await axios.get(url)
	const regex = /eval\((.*)\)/g;
	const evalCode = regex.exec(res.data)[0];
	var rawFile = '';

	try {
		const sandbox = {
			jwplayer: () => ({
				setup: async (config) => {
					if (config.sources && Array.isArray(config.sources)) {
						const firstSource = config.sources[0];
						if (firstSource && firstSource.file) {
							rawFile = firstSource.file
						} else {
							reject(new Error('No file found'));
						}
					} else {
						reject(new Error('No sources found'));
					}
				},
				on: () => { },
				addButton: () => { },
				getButton: () => { },
				seek: () => { },
				getPosition: () => { },
				addEventListener: () => { },
				setCurrentCaptions: () => { },
				pause: () => { },
			}),
			document: {
				addEventListener: (event, callback) => {
					if (event === 'DOMContentLoaded') {
						callback();
					}
				},
			},
			$: () => ({
				hide: () => { },
				get: () => { },
				detach: () => ({
					insertAfter: () => { },
				}),
			}),
			jQuery: {},
			p2pml: {
				hlsjs: {
					Engine: class {
						constructor() {
							// eslint-disable-next-line @typescript-eslint/ban-ts-comment
							// @ts-ignore
							this.on = () => { };
						}

						createLoaderClass() { }
					},
				},
			},
		};

		vm.createContext(sandbox);
		vm.runInContext(evalCode, sandbox);

	} catch (e) {

	}

	response['file'] = rawFile
	return response;
}

const getSubtitle = async (title, path, subpath) => {
	let result = {}

	if (subpath) {
		const downloadedFiles = await subscene.downloadSubtitle(
			subpath,
			{
				unzip: true, //Unzip the subtitle
				convert: true, // Convert the subtitle to vtt
			}
		);

		let bufferOriginal = Buffer.from(downloadedFiles[0].buffer);
		result = bufferOriginal.toString('utf-8')
	} else {
		if (path) {
			result = await subscene.getTitleDetails(
				path,
				true,
				{
					language: ["id", "en"],
					rate: ['positive']
				}
			);
		} else {
			result = await subscene.searchByTitle(title);
		}
	}


	return result;

}

const decode = (str) => {
	const keyBytes = new TextEncoder().encode(key);

	let j = 0;
	const s = new Uint8Array(256);
	for (let i = 0; i < 256; i += 1) {
		s[i] = i;
	}

	for (let i = 0, k = 0; i < 256; i += 1) {
		j = (j + s[i] + keyBytes[k % keyBytes.length]) & 0xff;
		[s[i], s[j]] = [s[j], s[i]];
		k += 1;
	}

	const decoded = new Uint8Array(str.length);
	let i = 0;
	let k = 0;
	for (let index = 0; index < str.length; index += 1) {
		i = (i + 1) & 0xff;
		k = (k + s[i]) & 0xff;
		[s[i], s[k]] = [s[k], s[i]];
		const t = (s[i] + s[k]) & 0xff;
		decoded[index] = str[index] ^ s[t];
	}

	return decoded;
}

const decryptSourceUrl = (sourceUrl) => {
	const encoded = decodeBase64UrlSafe(sourceUrl);
	const decoded = decode(encoded);
	const decodedText = new TextDecoder().decode(decoded);

	return decodeURIComponent(decodeURIComponent(decodedText));
}

const decodeBase64UrlSafe = (str) => {
	const standardizedInput = str.replace(/_/g, '/').replace(/-/g, '+');

	const binaryData = Buffer.from(standardizedInput, 'base64').toString('binary');

	const bytes = new Uint8Array(binaryData.length);
	for (let i = 0; i < bytes.length; i += 1) {
		bytes[i] = binaryData.charCodeAt(i);
	}

	return bytes;
}

module.exports = { getHome, getSearch, getGenre, getVideo, getSubtitle }