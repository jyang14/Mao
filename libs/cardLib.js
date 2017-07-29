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



function draw(cards) {
    cards.push(deck[POSITION]);
    POSITION--;
    if (POSITION === 0)
        shuffleDeck();
}


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

function undoDraw() {
    POSITION++;
}

module.exports = {
    shuffleDeck: shuffleDeck,
    draw: draw,
    cardToString: cardToString,
    undoDraw: undoDraw
}