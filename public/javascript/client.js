var socket = io.connect("/");
/*Initializing the connection with the server via websockets */

socket.on("players", function (players) {
    //console.log(players);
    $('#players').empty();
    $("#player_list").html('<li class="mdl-menu__item" data-val=""></li>');

    players.forEach(function (player) {
        $('#players').append('<li>' + player.name + ' - ' + player.cards + '</li>');
        $('#player_list').append(' <li class="mdl-menu__item" data-val="' + player.id + '">' + player.name + '</li>');
    });
    getmdlSelect.init(".getmdl-select");
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

socket.on("played", function (message) {
    $('#played_cards').append('<div>' + message + '<br /></div>');
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
            if ($('#hide_when_point_of_order').css('display') === 'none')
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

socket.on('accussation', function (accusation) {
    let id = Date.now();

    let accuser = accusation.accuser;
    let accuserID = accusation.accuserID;
    let accused = accusation.accused;
    let reason = accusation.reason;
    let Reason = reason.charAt(0).toUpperCase() + reason.slice(1);
    let punishment = accusation.punishment;


    $('#accusations').append('<div class="mdl-card mdl-shadow--2dp" id="' + id + '"> <div class="mdl-card__title"> <div class="mdl-card__title-text">' + Reason + '</div></div><div class="mdl-card__supporting-text"> ' + accuser + ' accuses you for ' + reason + '. Penalty: Draw ' + punishment + ' Card(s). </div><div class="mdl-card__actions mdl-card--border"> <input class="mdl-button mdl-js-button mdl-js-ripple-effect" type="button" id="' + id + '_accept" value="Accept"/><input class="mdl-button mdl-js-button mdl-js-ripple-effect" type="button" id="' + id + '_dismiss" value="Dismiss"/><input class="mdl-button mdl-js-button mdl-js-ripple-effect" type="button" id="' + id + '_false" value="False Accusation"/></div></div>');

    componentHandler.upgradeDom();

    $('#' + id + '_accept').click(() => {
        socket.emit('echo', accused + ' accepts the accusation of ' + reason);
        socket.emit('draw', punishment);
        $('#' + id).remove();
    });

    $('#' + id + '_dismiss').click(() => {
        socket.emit('echo', accused + ' dismisses the accusation of ' + reason);
        $('#' + id).remove();
    });

    $('#' + id + '_false').click(() => {
        socket.emit('accuse',
            {
                accused: accuserID,
                reason: "the false accusation of " + reason,
                punishment: punishment
            });
        $('#' + id).remove();
    });

});

$('#submit_username').click(function () {
    socket.emit('name', $('#name').val());

    $('#login').css("display", "none");
    $('#starter').css("display", "block");

});

$('#name').keypress(function (e) {
    if (e.which === 13) { //Enter key pressed
        $('#submit_username').click(); //Trigger search button click event
    }
});

$('#draw').click(function () {

    if (/[0-9]+/.test($("#draw_amount").val())) {
        socket.emit('draw', $("#draw_amount").val());
    }
    else if ($("#draw_amount").val() === "") {
        socket.emit('draw', 1);
    } else {//display error
        alert("Improper input for draw amount.");
        $("#draw_amount").val('');
    }
});

$('#draw_amount').keypress(function (e) {
    if (e.which === 13) { //Enter key pressed
        $('#draw').click(); //Trigger search button click event
    }
});

$('#submit_accusation').click(function () {

    let player = $("#player_list_selector").attr('data-val');
    let reason = $('#reason').val();
    let punishment = $("#punishment_amount").val();

    if (player === '') {
        alert('Please select someone to accuse');
        return;
    }

    if (reason === '') {
        alert('Please give a reason');
        return;
    }

    if (!/[0-9]+/.test(punishment)) {
        alert("Improper input for draw amount.");
        $("#punishment_amount").val('');
        return;
    } else if (punishment === '') {
        punishment = 1;
    }

    socket.emit('accuse',
        {
            accused: player,
            reason: reason,
            punishment: punishment
        });
});

