/**
 * Created by sridharrajs.
 */

'use strict';

let gravatar = require('nodejs-gravatar');
let mongoose = require('mongoose');
let wrapper = require('mongoose-callback-wrapper');
var ObjectId = require('mongoose').Types.ObjectId;

let userModelSchema = require('../models/user');
let userModel = mongoose.model('user');

let add = function (user, cb) {
	let item = new userModel({
		emailId: user.emailId,
		password: user.password,
		profile_url: gravatar.imageUrl(user.emailId),
		username: user.emailId
	});
	item.save((err, newDoc) => {
		if (err) {
			if (err.code === 11000) {
				return cb('EmailId is already taken');
			}
			return cb(err);
		}

		let user = {
			_id: newDoc._id,
			profile_url: newDoc.profile_url
		};
		return cb(null, user);
	});
};

let updateToken = function (userId, token, cb) {
	let condition = {
		_id: userId
	};
	let update = {
		token: token
	};
	let upsert = false;
	userModel.findOneAndUpdate(condition, update, upsert, cb);
};

let getUserByCredentials = function (emailId, cb) {
	let wrappedCallback = wrapper.wrap(cb, userModelSchema.getAttributes());
	let query = userModel.find({
		emailId: emailId
	});
	query.exec(wrappedCallback);
};

let getUserByUserId = (userId, cb)=> {
	let wrappedCallback = wrapper.wrap(cb, userModelSchema.getAttributes());
	let query = userModel.find({
		_id: new ObjectId(userId)
	});
	query.exec(wrappedCallback);
};

let updateByUserId = (user, cb)=> {
	let condition = {
		_id: user.userId
	};
	let update = {
		username: user.username
	};
	if (user.password) {
		update.password = user.password;
	}
	let upsert = {
		upsert: false,
		'new': true
	};
	userModel.findOneAndUpdate(condition, update, upsert, (err, doc)=> {
		cb(err, {
			username: doc.username,
			emailId: doc.emailId,
			profile_url: doc.profile_url
		});
	});
};

function updateLastSeen(userId, cb) {
	let condition = {
		_id: userId
	};
	let update = {
		last_seen: Date.now()
	};
	let upsert = {
		upsert: false,
		'new': true
	};
	userModel.findOneAndUpdate(condition, update, upsert, (err, doc)=> {
		cb(err, 'success');
	});
}

module.exports = {
	add,
	getUserByCredentials,
	updateToken,
	getUserByUserId,
	updateByUserId,
	updateLastSeen
};