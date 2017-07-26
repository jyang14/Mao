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

var deck = [];

for (x = 0; x < 52; x++) {
    deck.push(x);
    deck.push(x);
}

var POSITION = deck.length - 1;

function shuffleDeck() {
    let counter = deck.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = deck[counter];
        deck[counter] = deck[index];
        deck[index] = temp;
    }
    POSITION = deck.length - 1;
}

shuffleDeck();

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

function draw(cards) {
    cards.push(deck[POSITION]);
    POSITION--;
    if (POSITION == 0)
        shuffleDeck();
}

function log(message) {
    console.log(message);
    logs.push(message);
    io.sockets.emit('log', message);
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

        if (player.name != null) {
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
            card: card
        });
        played.push(card);
        io.sockets.emit('played', cardToString(card));
        log(player.name + " played " + cardToString(card));
        player.cards.sort((a, b) => a - b);
        socket.emit('cards', player.cards)
        scores();

    });

    socket.on('draw', function (data) {
        draw(player.cards);
        log(player.name + ' drew a card.');

        history.push({
            player: player,
            action: 'draw',
            card: player.cards[player.cards.length - 1]
        });
        player.cards.sort((a, b) => a - b);
        socket.emit('cards', player.cards)
        scores();

    });

    socket.on("message", function (data) {

        switch (data) {
            case "start":
                console.log(player.name + " started the game of Mao.");
                io.sockets.send("start");

                shuffleDeck();

                played = [];
                logs = [];
                history = [];

                draw(played);

                io.sockets.emit('played', cardToString(played[0]));
                log('Initial card is ' + cardToString(played[0]));

                players.forEach(function (person) {
                    person.cards = [];
                    for (i = 0; i < 7; i++) {
                        draw(person.cards);
                    }
                    person.cards.sort((a, b) => a - b);
                    person.connection.emit('cards', person.cards);
                });
                scores();

                break;
            case "mao":
                log(player.name + " declares Mao.");
                break;
            case "shuffle":
                log(player.name + " shuffled the deck (irreversible).");
                shuffleDeck();
                break;
            case "undo":
                log(player.name + " attempted to undo the last move.");
                if (history.length < 1) {
                    log(player.name + ", why are you trying to undo when there are no turns to undo?");
                    break;
                }
                var last = history.pop();
                if (last.player == player) {
                    if (last.action == "draw") {
                        player.cards.splice(player.cards.indexOf(last.card), 1);
                        POSITION++;
                        log("Undo success. Card is returned to the top of the pile unless the deck has been shuffled after the card was drawn.");
                        player.cards.sort((a, b) => a - b);
                        socket.emit('cards', player.cards)
                        scores();
                    } else if (last.action == "play") {
                        var card = played.pop();
                        if (card != last.card) {
                            log("Undo unsuccessful. Unrecoverable error. Contact creator.");
                            played.push(card);
                            break;
                        }
                        log("Undo success. Card is returned to hand.");
                        io.sockets.emit('remove_from_played', card);
                        player.cards.push(card);
                        player.cards.sort((a, b) => a - b);
                        socket.emit('cards', player.cards)
                        scores();
                    }
                } else {
                    log(player.name + " is unable to undo the last move.");
                    log(last.player.name + " made the last move.");
                }
                break;
            default:
                console.log(player.name + " used command: " + data);
                io.sockets.send(data);

        }

    });

});
