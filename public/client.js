var socket = io.connect("/");
/*Initializing the connection with the server via websockets */

socket.on("players", function (players) {
	//console.log(players);
	$('#players').empty();
	players.forEach(function (player) {
		$('#players').append('<li>' + player + '</li>');
	});
});

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

socket.on("cards", function (cards) {
	//console.log(cards);
	$('#cards').empty();
	for (var x = 0; x < cards.length; x++) {
		$('#cards').append('<input type="radio" name="card" id="card_' + x +
			'" value="' + x + '"/><label for="card_' + x + '">' + cardToString(cards[x]) + '</label>    ');
	}
	$("input:radio[name=card]:first").attr('checked', true);
});

socket.on("remove_from_played", function (card) {
	//console.log(cards);
	$("#played_cards div:last").remove();
});

socket.on("played", function (message) {
	$('#played_cards').append('<div>'+message + '<br /></div>');
	$("#played_cards").animate({
        scrollTop: $("#played_cards").prop("scrollHeight")
    }, 300);
});

socket.on("message", function (message) {

	switch (message) {
	case "start":
		$('#starter').css("display", "none");
		$('#game').css("display", "block");
		break;
	case "reset":
		$("#logs").empty();
		$("#cards").empty();
		$("#played_cards").empty();
		$('#starter').css("display", "block");
		$('#game').css("display", "none");
		break;
	case "point of order":
		if ($('#hide_when_point_of_order').css('display') == 'none')
			$('#hide_when_point_of_order').css("display", "block");
		else
			$('#hide_when_point_of_order').css("display", "none");
		break;

	}
});

socket.on('log', function (message) {
	$('#logs').append(message + '</br>');
	$("#logs").animate({
        scrollTop: $("#logs").prop("scrollHeight")
    }, 300);
});

$(function () {
	$('#submit_username').click(function () {
		socket.emit('name', $('#name').val());

		$('#login').css("display", "none");
		$('#starter').css("display", "block"); ;

	});
});

$('#name').keypress(function (e) {
	if (e.which == 13) { //Enter key pressed
		$('#submit_username').click(); //Trigger search button click event
	}
});

$(function () {
	$('#starter').click(function () {
		socket.send('start');
	});
});

$(function () {
	$('#play').click(function () {
		socket.emit('play', $('input[name=card]:checked', '#cards').val());
	});
});

$(function () {
	$('#draw_one').click(function () {
		socket.emit('draw', '1');
	});
});

$(function () {
	$('#undo').click(function () {
		socket.send("undo");
	});
});

$(function () {
	$('#shuffle').click(function () {
		socket.send("shuffle");
	});
});

$(function () {
	$('#mao').click(function () {
		socket.send("mao");
	});
});

$(function () {
	$('#reset').click(function () {
		socket.send("reset");
	});
});

$(function () {
	$('#point_of_order').click(function () {
		socket.send("point of order");
	});
});
