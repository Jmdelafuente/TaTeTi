const debug = true;
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

function originIsAllowed(origin) {
	// put logic here to detect whether the specified origin is allowed.
	return true;  }

//--------------------- EVENTOS TA-TE-TI------------------
io.on('connection', wsTateti => {
	let id = wsTateti.id;
  if(debug){
    console.log("New client connected. ID: ", id);
  }
	ws[id] = wsTateti;
  // Asignamos 'X' o 'O'
  if(simbolos.length > 0){
    let s = simbolos.pop();
    jugadores[s] = id;
    simbolo_asignado[id] = s;
  };
  if(simbolos.length == 0){
    io.emit("mostrar_tablero");
    //Asigna un turno a un jugador
    let jugador_inicial = random_item(jugadores);
    jugador_inicial = ws[jugador_inicial];
    // jugador_inicial = ws[jugadores['X']];
    jugador_inicial.emit("turno_jugador",JSON.stringify('{}'));
    turno = simbolo_asignado[jugador_inicial.id];
    if(debug){
      console.log(turno);
    }
  };
  if(debug){
    console.log(simbolo_asignado[id] + ' - ' + Object.keys(simbolos).length);
  }
  wsTateti.emit('asignacion_simbolo',JSON.stringify(simbolo_asignado[id]));

  wsTateti.on('disconnect', () => {
    if(debug){
		    console.log("Client disconnected. ID: ", wsTateti.id);
    };
    delete ws[wsTateti.id];                           // Eliminamos el WS
    simbolos.push(simbolo_asignado[wsTateti.id]);     // Volvemos a poner disponible el simbolo
    delete jugadores[simbolo_asignado[wsTateti.id]];  // Eliminamos la relacion simbolo-ws.id
    delete simbolos[wsTateti.id];                     // Eliminamos la relacion ws.id-simbolo
    // socket.broadcast.emit("clientdisconnect", id);
    if(simbolos.length == 2){
      reiniciar_partida();
    }
	});
	//
	wsTateti.on('jugar_turno', function(req)//request[i:fila;j:columna;p:jugador]
	{
    var request = JSON.parse(req);
    if(debug){
		    console.log(request);
    }
    idSocket = request.p;
    simbolo = simbolo_asignado[idSocket];
		//verificar si es mi turno
		if (turno == simbolo)
			{
				fila = parseInt(request.i);
				columna = parseInt(request.j);

        //seleccionar casilla
				if(tablero[fila][columna] == '#')
				{
          console.log('La casilla esta vacía');
					tablero[fila][columna] = simbolo;
          ronda += 1;

          verificar_ganador();

          //verificar si hay empate
          if (estado_juego == '')
          {
            if(ronda == 9)
            {
              estado_juego = 'D';
            }
          }
          if(debug){
            console.log('Por chequear Game Over');
          }
          //dispara game over.
          if(estado_juego != ''){
            let mensaje = {};
            if(debug){
              console.log(estado_juego);
            }
            if(estado_juego == 'D'){
              mensaje.resultado = '¡Tenemos un empate!';
              io.emit("game_over",JSON.stringify(mensaje));
            }else{
              for (var key in ws){
                  if(key == jugadores[estado_juego]){
                    mensaje.resultado = '¡Has ganado!';
                  }else{
                    mensaje.resultado = '¡Has perdido!';

                  }
                  ws[key].emit("game_over",JSON.stringify(mensaje));
              };
            };
            // Limpiamos tablero;
            reiniciar_partida();
          };
          if(debug){
            console.log('NO ES GAME OVER!');
          }
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
          // TODO: error de movimiento
        }
			}
	});

	wsTateti.on('game_over', function(request)
	{
			// le avisa a los jugadores que el juego termino
      reiniciar_partida();

	});
});

function random_item(items){
  let keys = Object.keys(items);
  let i = keys.length;
  let random = Math.floor(Math.random() * i);
  return items[keys[random]];
}

function reiniciar_partida(){
  tablero=[['#','#','#'],
               ['#','#','#'],
               ['#','#','#']
              ];
  estado_juego = '';
  ronda = 0;
  simbolos=['X','O'];
  simbolo_asignado = [];
}
function verificar_ganador(){
  // Verificar 3 en linea vertical

  if ( (tablero[0][0] == tablero[1][0]) && (tablero[1][0]  == tablero[2][0]) && (tablero[2][0] != '#'))
    {
        console.log('Pimer if');
        console.log(tablero[0][0]);

        estado_juego = tablero[0][0];
    }
  else
    {
      if((tablero[0][1] == tablero[1][1]) && (tablero[1][1] == tablero[2][1]) && (tablero[2][1] != '#'))
      {
        estado_juego = tablero[1][1];
      }
      else
      {
        if((tablero[0][2] == tablero[1][2]) && (tablero[1][2] == tablero[2][2]) && (tablero[2][2] != '#'))
        {
          estado_juego = tablero[2][2];
        }
      }
    }
  // verificar 3 en linea horizontal
  if (estado_juego == '')
  {
    if((tablero[0][0] == tablero[0][1]) && (tablero[0][1] == tablero[0][2]) &&(tablero[0][2] != '#')  )
    {
      estado_juego = tablero[0][0];
    }
    else
    {
      if((tablero[1][0] == tablero[1][1]) && (tablero[1][1] == tablero[1][2]) && (tablero[1][2] != '#'))
      {
        estado_juego = tablero[1][1];
      }
      else
      {
        if((tablero[2][0] == tablero[2][1]) && (tablero[2][1] == tablero[2][2]) && (tablero[2][2]!= '#') )
        {
          estado_juego = tablero[2][2];
        }
      }
    }
  }

  //verificar 3 en linea diagonal
  if( estado_juego == '')
  {
    if((tablero[0][0] == tablero[1][1]) && (tablero[1][1]  == tablero[2][2])&& (tablero[2][2]!= '#'))
    {   estado_juego = tablero[0][0];}
    if((tablero[0][2] == tablero[1][1]) && (tablero[1][1] == tablero[2][0]) &&(tablero[2][0] != '#'))
    {   estado_juego = tablero[1][1];}
  }
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
