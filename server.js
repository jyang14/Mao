var express = require('express');
var http = require('http');
var io = require('socket.io');

var cardLib = require('./libs/cardLib');

var app = express();
app.use(express.static('./public'));
//Specifying the public folder of the server to make the html accesible using the static middleware

var server = http.createServer(app).listen(process.env.PORT || 333);
//Server listens on the port 333
io = io.listen(server);
/*initializing the websockets communication , server instance has to be sent as the argument */

var players = [];

var sendForPlaying = (message) => {
    players.forEach((player) => {
        if (player.playing)
            player.socket.send(message);
    });
};

var sendAllPlayers = (message) => {
    players.forEach((player) => {
        player.socket.send(message);
    });
};

var started = false;

function consoleLog(message, ip){
	console.log(ip+" : "+message);
}


function scores() {
    var scores = [];
    players.forEach((person, index) => {
        scores.push({
            name: person.name,
            cards: person.playing ? person.cards.length : -1,
            id: index
        });
    });
    io.sockets.emit('players', scores);
}

function log(message) {
    console.log(message);
    logs.push(message);
    io.sockets.emit('log', message);
}

function cardData(socket, cards) {
    cards.sort((a, b) => a - b);
    socket.emit('cards', cards);
}

var played = [];
var logs = [];
var history = [];

io.on("connection", function (socket) {
	/*Associating the callback function to be executed when client visits the page and
	websocket connection is made */
	
	var ip = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;

    /*sending data to the client , this triggers a message event at the client side */
    consoleLog('Connection with the client established', ip);

    socket.emit('logs', logs);
    socket.emit('played', played);

    var player = {
        socket: socket,
        name: null,
        cards: [],
        playing: false
    };

    scores();

    socket.on('name', function (data) {
        player.name = data;
        consoleLog(data, ip);
        players.push(player);
        scores();
        if (!started)
            socket.send('allow_start');
    });

    socket.on('disconnect', function () {
        consoleLog('Client disconnected.', ip);

        if (player.name !== null) {
            var i = players.indexOf(player);
            players.splice(i, 1);
            scores();

            var stillPlaying = false;

            players.forEach((person) => { if (person.playing) stillPlaying = true; });

            if (!stillPlaying) {
                started = false;
                sendAllPlayers('allow_start');
                io.sockets.send('reset');
            }
        }
    });

    socket.on('play', function (data) {
        var card = player.cards[data];
        player.cards.splice(data, 1);
        history.push({
            player: player,
            action: 'play',
            cards: card
        });
        played.push(card);
        io.sockets.emit('play', cardLib.cardToString(card));
        log(player.name + " played " + cardLib.cardToString(card));
        cardData(socket, player.cards);
        scores();

    });

    socket.on('draw', function (data) {
        var temp = [];
        for (var i = 0; i < parseInt(data); i++)
            cardLib.draw(temp);
        log(player.name + ' drew ' + data + ' card(s).');

        history.push({
            player: player,
            action: 'draw',
            cards: temp
        });

        player.cards.push(...temp);

        cardData(socket, player.cards);
        scores();

    });

    socket.on('accuse', function (accusation) {
        let accuser = player.name;
        let accused = players[accusation.accused];
        let reason = accusation.reason;
        let punishment = parseInt(accusation.punishment);

        log(accuser + ' accuses ' + accused.name + ' of ' + reason + '; Penalty: Draw ' + punishment + ' card(s).');

        accused.socket.emit('accussation', {
            accuser: accuser,
            accuserID: players.indexOf(player),
            accused: accused.name,
            reason: reason,
            punishment: punishment
        });

    });

    socket.on('echo', (message) => { log(message); });

    var undo = () => {
        if (history.length < 1) {
            log(player.name + "attempted to undo nothing.");
            return;
        }
        var last = history.pop();
        if (last.player === player) {
            if (last.action === "draw") {
                last.cards.forEach((card) => {
                    player.cards.splice(player.cards.indexOf(card), 1);
                    cardLib.undoDraw();
                });
                log(player.name + " returned the last draw to the deck.");
                cardData(socket, player.cards);
                scores();
            } else if (last.action === "play") {
                var card = played.pop();
                if (card !== last.cards) {
                    log(player.name + "'s undo was unsuccessful. Unrecoverable error. Undo history reset. Contact creator.");
                    history = [];
                    played.push(card);
                    return;
                }
                log(player.name + " unplayed the last card.");
                io.sockets.emit('remove_from_played', card);
                player.cards.push(card);
                cardData(socket, player.cards);
                scores();
            }
        } else {
            log(player.name + " tried to undo " + last.player.name + "'s last move.");
        }
    };


    socket.on("message", function (data) {

        switch (data) {
            case "start":
                if (started) {
                    break;
                }

                cardLib.shuffleDeck();

                played = [];
                logs = [];
                history = [];

                cardLib.draw(played);

                started = true;
                io.sockets.send('reset');
                players.forEach(function (person) {
                    person.playing = true;
                    person.socket.send('start');
                    person.cards = [];
                    for (i = 0; i < 7; i++) {
                        cardLib.draw(person.cards);
                    }

                    cardData(person.socket, person.cards);
                });

                log(player.name + " started the game of Mao.");

                io.sockets.emit('play', cardLib.cardToString(played[0]));
                log('Initial card is ' + cardLib.cardToString(played[0]));

                scores();

                break;
            case "mao":
                log(player.name + " declares Mao.");
                break;
            case "shuffle":
                log(player.name + " shuffled the deck (irreversible).");
                cardLib.shuffleDeck();
                break;
            case "undo":
                undo();
                break;
            case "pass":
                log(player.name + " ends his/her turn.");
                break;
            case "reset":
                started = false;
                console.log(player.name + " used command: " + data);
                io.sockets.send(data);
                sendAllPlayers('allow_start');
                break;
            default:
                console.log(player.name + " used command: " + data);
                sendForPlaying(data);
        }

    });

});
