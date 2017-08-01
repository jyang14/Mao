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

function scores() {
    var scores = [];
    players.forEach((person, index) => {
        scores.push({
            name: person.name,
            cards: person.cards.length,
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

    /*sending data to the client , this triggers a message event at the client side */
    console.log('Connection with the client established');

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
        console.log('Client disconnected.');

        if (player.name !== null) {
            var i = players.indexOf(player);
            players.splice(i, 1);
            scores();

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
        io.sockets.emit('played', cardLib.cardToString(card));
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

        accused.connection.emit('accussation', {
            accuser: accuser,
            accuserID: players.indexOf(player),
            accused: accused.name,
            reason: reason,
            punishment: punishment
        });

    });

    socket.on('echo', (message) => { log(message); });


    socket.on("message", function (data) {

        switch (data) {
            case "start":
                console.log(player.name + " started the game of Mao.");
                io.sockets.send("start");

                cardLib.shuffleDeck();

                played = [];
                logs = [];
                history = [];

                cardLib.draw(played);

                io.sockets.emit('played', cardLib.cardToString(played[0]));
                log('Initial card is ' + cardLib.cardToString(played[0]));

                players.forEach(function (person) {
                    person.cards = [];
                    for (i = 0; i < 7; i++) {
                        cardLib.draw(person.cards);
                    }

                    cardData(person.connection, person.cards);
                });
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
                if (history.length < 1) {
                    log(player.name + "attempted to undo nothing.");
                    break;
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
                            break;
                        }
                        log(player.name + " unplayed the last card.");
                        io.sockets.emit('remove_from_played', card);
                        player.cards.push(card);
                        cardData(socket, player.cards);
                        scores();
                    }
                } else {
                    log(player.name + " tried to undo" + last.player.name + "'s last move.");
                }
                break;
            default:
                console.log(player.name + " used command: " + data);
                io.sockets.send(data);

        }

    });

});
