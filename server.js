const server = require('http').createServer();
var io = require('socket.io')(server, { origins: '*:*'});

var turno = 'X';
var tablero=[['#','#','#'],
             ['#','#','#'],
             ['#','#','#']
            ];
var jugadores=[];       //Simbolo -> id de ws
var ws = [];            //id de ws -> ws
var simbolos=['X','O']; //Simbolos disponibles
var simbolo_asignado = [];       //id de ws -> simbolo
var estado_juego = ''; //'X' Gano jugador x; 'O' Gano jugador o; 'D' Empate; '' juego en curso.
var ronda = 0;
var combinacionesGanadoras = [
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]]
]; // game winning combination index

function originIsAllowed(origin) {
	// put logic here to detect whether the specified origin is allowed.
	return true;  }

//--------------------- EVENTOS TA-TE-TI------------------
io.on('connection', wsTateti => {
	let id = wsTateti.id;
	console.log("New client connected. ID: ", id);
	ws[id] = wsTateti;
  // Asignamos 'X' o 'O'
  if(simbolos.length > 0){
    let s = simbolos.pop();
    jugadores[s] = id;
    simbolo_asignado[id] = s;
  };
  if(simbolos.length == 0){
    // io.emit("mostrar_tablero");
    //Asigna un turno a un jugador
    // let jugador_inicial = random_item(ws);
    let jugador_inicial = ws[jugadores['X']];
    jugador_inicial.emit("turno_jugador",JSON.stringify('{}'));
    turno = simbolo_asignado[jugador_inicial.id];
    console.log(turno);
  };
  console.log(simbolo_asignado[id] + ' - ' + Object.keys(simbolos).length);
  wsTateti.emit('asignacion_simbolo',JSON.stringify(simbolo_asignado[id]));

  wsTateti.on('disconnect', () => {
		console.log("Client disconnected. ID: ", wsTateti.id);
    delete ws[wsTateti.id]; // Eliminamos el WS
    simbolos.push(simbolo_asignado[wsTateti.id]); // Volvemos a poner disponible el simbolo
    delete jugadores[simbolo_asignado[wsTateti.id]]; // Eliminamos la relacion simbolo-ws.id
    delete simbolos[wsTateti.id]; // Eliminamos la relacion ws.id-simbolo
    // socket.broadcast.emit("clientdisconnect", id);
	});
	//
	wsTateti.on('jugar_turno', function(req)//request[i:fila;j:columna;p:jugador]
	{
    var request = JSON.parse(req);
		console.log(request);
    idSocket = request.p;
    simbolo = simbolo_asignado[idSocket];
		//verificar si es mi turno
		if (turno == simbolo)
			{
				fila = parseInt(request.i);
				columna = parseInt(request.j);

        var i = 0;
        var j = 0;
        //seleccionar casilla
				if(tablero[fila][columna] == '#')
				{
          console.log('La casilla esta vacía');
					tablero[fila][columna] = simbolo;
          ronda += 1;
          //verificar si se termino el juego
          // while(estado_juego != '' && i < 3 && j < 3)
          // {
          //   if ( tablero[i][j] == tablero[i+1][j] && tablero[i+1][j] == tablero[i+2][j] != '#')
          //   {
          //       estado_juego = tablero[i][j];
          //   }
          //   else
          //   {
          //     if(tablero[i][j] == tablero[i][j+1] && tablero[i][j+1] == tablero[i][j+2] != '#')
          //     {
          //       estado_juego = tablero[i][j];
          //     }
          //   }
          //   i++;
          //   j++;
          // }
          // if(tablero[0][0] == tablero[1][1] && tablero[1][1]  == tablero[2][2] != '#')
          // {
          //   estado_juego = tablero[0][0];
          //
          // }
          // if(tablero[0][2] == tablero[1][1] && tablero[1][1] == tablero[2][0] != '#')
          // {
          //   estado_juego = tablero[1][1];
          // }

          //verificar si hay empate
          if (estado_juego == '')
          {
            if(ronda == 9)
            {
              estado_juego = 'D';
            }
          }
          console.log('Por chequear Game Over');
          //dispara game over.
          if(estado_juego != ''){
            let mensaje = {};
            console.log(estado_juego);
            if(estado_juego == 'D'){
              mensaje.resultado = '¡Tenemos un empate!';
              io.emit("game_over",mensaje)
            }else{
              for (var key in ws){
                  if(key = jugadores[estado_juego]){
                    mensaje.resultado = '¡Has ganado!';
                  }else{
                    mensaje.resultado = '¡Has perdido!';
                  }
                  ws[key].emit("game_over",mensaje);
              };
            };
          };
          console.log('IUJUU NO ES GAME OVER!');
          // si no se termino Event cambio de turno
          let ultimo_movimiento = {};
          ultimo_movimiento.fila = fila;
          ultimo_movimiento.columna = columna;
          ultimo_movimiento.simbolo = simbolo;
          if(simbolo == 'X'){
            otro_jugador = jugadores['O'];
            turno = 'O';
          }else{
            otro_jugador = jugadores['X'];
            turno = 'X';
          }
          ws[otro_jugador].emit("turno_jugador",JSON.stringify(ultimo_movimiento));
          console.log(ultimo_movimiento);
				}
        else {
          // error de movimiento
        }
			}
	});

	wsTateti.on('game_over', function(request)
	{
			// le avisa a los jugadores que el juego termino
	});
});

function random_item(items){
  return items[Math.floor(Math.random() * (Object.keys(items)).length)]
}
server.listen(3000);
//-------------------- FIN EVENTOS TA-TE-TI -----------------
// wsTateti.on('request', function(request) {
// 	if (!originIsAllowed(request.origin)) {
// 	// Make sure we only accept requests from an allowed origin
// 	request.reject();
// 	console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
// 	return;  }
//
// var connection = request.accept('echo-protocol', request.origin);
//
// console.log((new Date()) + ' Connection accepted.');
//
// connection.on('message', function(message) {
// 	if (message.type === 'utf8') {
// 	console.log('Received Message: ' + message.utf8Data);
// 	var counter = 0;
// 	new cron.schedule('* * * * * *', function(){
// 		counter++;
// 		connection.sendUTF(Math.random());
// 	//	console.log("Hello" + counter);
//             }, null, true, "America/Los_Angeles");
// 	} else if (message.type === 'binary') {
// 		console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
// 	        connection.sendBytes(message.binaryData);          }      });
//
// connection.on('close', function(reasonCode, description) {
// 	console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
// });
// });
