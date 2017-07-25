var express = require('express');
var http = require('http');
var io = require('socket.io');

var app = express();
app.use(express.static('./public'));
//Specifying the public folder of the server to make the html accesible using the static middleware

var server = http.createServer(app).listen(process.env.PORT || 333);
//Server listens on the port 333
io = io.listen(server);
/*initializing the websockets communication , server instance has to be sent as the argument */

function shuffle(array) {
	let counter = array.length;

	// While there are elements in the array
	while (counter > 0) {
		// Pick a random index
		let index = Math.floor(Math.random() * counter);

		// Decrease counter by 1
		counter--;

		// And swap the last element with it
		let temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}

}
var deck = [];

for (x = 0; x < 52; x++) {
	deck.push(x);
	deck.push(x);
}

var POSITION = deck.length - 1;

shuffle(deck);

var players = [];

function cardToString(card) {
	var suit = '';

	switch (Math.trunc(card / 13)) {
	case 0:
		suit = '♦️';
		break;
	case 1:
		suit = '♣️';
		break;
	case 2:
		suit = '♥️';
		break;
	default:
		suit = '♠️';
	}

	var face = '';
	switch (card % 13) {
	case 0:
		face = 'A';
		break;
	case 1:
		face = '2';
		break;
	case 2:
		face = '3';
		break;
	case 3:
		face = '4';
		break;
	case 4:
		face = '5';
		break;
	case 5:
		face = '6';
		break;
	case 6:
		face = '7';
		break;
	case 7:
		face = '8';
		break;
	case 8:
		face = '9';
		break;
	case 9:
		face = '10';
		break;
	case 10:
		face = 'J';
		break;
	case 11:
		face = 'Q';
		break;
	default:
		face = 'K';
	}

	return suit + face;
}

function scores() {
	var scores = [];
	players.forEach(function (person) {
		scores.push(person.name + " - " + person.cards.length);
	});
	io.sockets.emit('players', scores);
}

io.on("connection", function (socket) {
	/*Associating the callback function to be executed when client visits the page and
	websocket connection is made */

	/*sending data to the client , this triggers a message event at the client side */
	console.log('Socket.io Connection with the client established');

	var player = {
		connection: socket,
		name: null,
		cards: []
	};

	scores();

	socket.on('name', function (data) {
		player.name = data;
		console.log(data);
		players.push(player);
		scores();
	});

	socket.on('disconnect', function () {
		console.log('Got disconnected!');

		if (player.name != null) {
			var i = players.indexOf(player);
			players.splice(i, 1);
			scores();

		}
	});

	socket.on('play', function (data) {
		var card = player.cards[data]
			player.cards.splice(data, 1);
		io.sockets.emit('log', player.name + ": " + cardToString(card));
		player.cards.sort((a, b) => a - b);
		socket.emit('cards', player.cards)
		scores();

	});

	socket.on('draw', function (data) {
		player.cards.push(deck[POSITION]);
		POSITION--;
		if (POSITION == 0)
			POSITION = deck.length - 1;
		io.sockets.emit('log', player.name + ' drew a card.');
		player.cards.sort((a, b) => a - b);
		socket.emit('cards', player.cards)
		scores();

	});

	socket.on("message", function (data) {

		console.log(data);

		switch (data) {
		case "start":
			io.sockets.send("start");

			io.sockets.emit('log', cardToString(deck[POSITION]));

			POSITION--;
			if (POSITION == 0)
				POSITION = deck.length - 1;

			players.forEach(function (person) {
				person.cards = [];
				for (i = 0; i < 7; i++) {
					person.cards.push(deck[POSITION]);
					POSITION--;
					if (POSITION == 0)
						POSITION = deck.length - 1;

				}
				 person.cards.sort((a, b) => a - b);
				person.connection.emit('cards', person.cards);
			});
			scores();

			break;
		case "mao":
			io.sockets.emit('log', player.name + " declares Mao.");
			break;
		default:
			io.sockets.send(data);

		}

	});

});
