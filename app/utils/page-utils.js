/**
 * Created by sridharrajs on 2/5/16.
 */

'use strict';

let _ = require('lodash');
let _s = require('underscore.string');
let async = require('async');
let cheerio = require('cheerio');
let fs = require('fs');
let request = require('request').defaults({
	maxRedirects: 20
});
let realurl = require('realurl');
let url = require('url');

const RULES_LOCATION = __dirname + '/../rules/rules.json';
const RULES = JSON.parse(fs.readFileSync(RULES_LOCATION, 'UTF-8'));
const SUCCESS_CODES = [200, 201, 301, 302];
const DOMAIN_TAG = RULES.domain;
const DOMAINS = _.keys(DOMAIN_TAG);
const TAGS = _.values(DOMAIN_TAG);

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64; rv:46.0) Gecko/20100101 Firefox/46.0';

const VIDEO_DOMAINS = [
	'youtube.com',
	'ted.com'
];

function santizeURL(url, cb) {
	//because by deafult youtube urls like
	//https://www.youtube.com/watch?v=FZ6lZJWL_Xk
	//https://www.youtube.com/watch?v=yVpbFMhOAwE
	//https://news.ycombinator.com/item?id=11467176
	//https://news.ycombinator.com/item?id=11467640

	if (_.includes(url, 'youtube.com')) {
		return cb(null, url);
	} else if (_.includes(url, 'news.ycombinator.com')) {
		return cb(null, url);
	}

	realurl.get(url, (error, result) => {
		cb(null, _.first(result.split('?')));
	});
}

function isVideoType(url) {
	let isVideo = false;
	_.each(VIDEO_DOMAINS, (domain) => {
		if (_.includes(url, domain)) {
			isVideo = true;
			return false;
		}
	});
	return isVideo;
}

function getTagByDomain(hostURL) {
	let host = url.parse(hostURL).hostname;
	let tag = '';
	_.each(DOMAINS, (domain)=> {
		if (_s.include(host, domain)) {
			tag = DOMAIN_TAG[domain];
		}
	});
	return tag;
}

function extractDetails(body, pageURL, cb) {
	let $ = cheerio.load(body);
	async.parallel([(callback)=> {
			let title = $('title').text().trim();
			callback(null, title);
		}, (callback)=> {
			let description = '';
			let meta = $('meta[name=\'description\']');
			if (!_.isEmpty(meta)) {
				meta = meta[0];
				description = meta.attribs.content;
			}
			if (!description) {
				meta = $('meta[name=\'Description\']');
				if (!_.isEmpty(meta)) {
					meta = meta[0];
					description = meta.attribs.content;
				}
			}
			callback(null, description);
		}, (callback)=> {
			let tag = getTagByDomain(pageURL);
			callback(null, tag);
		}, (callback)=> {
			let isVideo = isVideoType(pageURL);
			callback(null, isVideo);
		}, (callback)=> {
			santizeURL(pageURL, callback);
		}], (err, values)=> {
			if (err) {
				return cb(err.stack);
			}
			let items = {};
			items.title = values[0];
			items.description = values[1];
			items.tag = values[2];
			items.isVideo = values[3];
			items.sanitizedURL = values[4];
			items.host = url.parse(pageURL).hostname;

			cb(null, items);
		}
	);

}

function getDetails(pageURL, metaCb) {
	let options = {
		url: pageURL,
		rejectUnauthorized: false,
		headers: {
			'User-Agent': USER_AGENT
		},
		followAllRedirects: true
	};
	request(options, (err, response, body)=> {
		if (err) {
			return metaCb(err.stack);
		}
		console.log(response.request.href);
		if (!_.contains(SUCCESS_CODES, response.statusCode)) {
			return metaCb(response.statusCode);
		}

		extractDetails(body, pageURL, (err, details)=> {
			metaCb(null, details);
		});

	});
}

function getTags() {
	return TAGS;
}

module.exports = {
	getDetails,
	getTagByDomain,
	getTags
};
