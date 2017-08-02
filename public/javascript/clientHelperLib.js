
socket.on("remove_from_played", function (card) {
    $("#played_cards div:last").remove();
});

$('#starter').click(function () {
    socket.send('start');
});

$('#play').click(function () {
    socket.emit('play', $('input[name=card]:checked', '#cards').val());
});

$('#undo').click(function () {
    socket.send("undo");
});

$('#pass').click(function () {
    socket.send("pass");
});


$('#shuffle').click(function () {
    socket.send("shuffle");
});

$('#mao').click(function () {
    socket.send("mao");
});

$('#reset').click(function () {
    socket.send("reset");
});

$('#point_of_order').click(function () {
    socket.send("point of order");
});