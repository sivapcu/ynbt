/**
 * Created by sridharrajs.
 */

'use strict';

const async = require('async');
const bcrypt = require('bcrypt-as-promised');
const express = require('express');
const isValidEmail = require('is-valid-email');
const qs = require('qs');

let app = express.Router();

let articleController = require('../controllers/article-controller');
let userController = require('../controllers/user-controller');
let jwtController = require('../controllers/jwt-controller');

function login(req, res) {
	let body = qs.parse(req.body);
	let email = body.email;
	let password = body.password;

	if (!email || !password) {
		return res.status(400).send({
			msg: 'Please enter proper values!'
		});
	}
	if (!isValidEmail(email)) {
		return res.status(400).send({
			msg: 'Please valid email'
		});
	}

	userController.getUserByCredentials(email).then((user)=> {
		if (!user) {
			return Promise.reject({
				msg: 'Invalid user email/password'
			});
		}
		let saltedPwd = user.password;
		return bcrypt.compare(password, saltedPwd).then(()=> {
			return Promise.resolve({
				id: user._id,
				profile_url: user.profile_url
			});
		});
	}).then((user)=> {
		res.status(200).send({
			token: jwtController.generateToken(user.id),
			profile_url: user.profile_url
		});
	}).catch((err) => {
		if (err instanceof bcrypt.MISMATCH_ERROR) {
			return res.status(401).send({
				msg: 'Invalid password'
			});
		}
		return res.status(401).send({
			msg: err.msg
		});
	});

}

function invite(req, res) {
	let body = qs.parse(req.body);
	let email = body.email;
	let password = body.password;

	if (!email || !password) {
		return res.status(400).send({
			msg: 'Please enter proper values!'
		});
	}
	if (!isValidEmail(email)) {
		return res.status(400).send({
			msg: 'Please valid email'
		});
	}

	bcrypt.hash(password).then((hashedPassword)=> {
		return userController.add({
			email: email,
			password: hashedPassword
		});
	}).then(()=> {
		res.status(200).send({
			msg: 'User created successfully!'
		});
	}).catch((err) => {
		return res.status(500).send({
			err: err
		});
	});

}

function getMe(req, res) {
	let userId = req.uid;

	Promise.all([
		articleController.getActiveCount(userId),
		userController.getById(userId)
	]).then((results)=> {
		let user = results[1];
		res.status(200).send({
			data: {
				me: user,
				articlesCount: results[0]
			}
		});
	}).catch((err) => {
		res.status(500).send({
			err: err.stack
		});
	});

}

function updateMe(req, res) {
	let body = qs.parse(req.body);

	let user = {
		userId: req.uid,
		user_name: body.user_name
	};

	let newPassword = body.newPassword;
	let reloadReq = false;
	if (newPassword && newPassword.trim()) {
		user.password = bcrypt.hashSync(newPassword);
		reloadReq = true;
	}

	if (!user.username) {
		return res.status(400).send({
			msg: 'invalid username'
		});
	}

	userController.updateByUserId(user).then(()=> {
		res.status(200).send({
			data: {
				items: items,
				reloadReq: reloadReq
			}
		});
	}).catch((err) => {
		return res.status(500).send({
			msg: err
		});
	});

}

let lastLoginUpdater = require('../middleware/last-login');
app.put('/me', [lastLoginUpdater], updateMe)
	.get('/me', [lastLoginUpdater], getMe);

app.post('/invite', invite);
app.post('/login', login);

module.exports = app;
