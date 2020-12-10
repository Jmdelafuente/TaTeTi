//--------------------- INICIALIZACION------------------
const debug = true;
const fs = require("fs");
const server = require("http").createServer();
const os = require("os");
var io = require("socket.io")(server, { origins: "*:*" });

var turno = "X";
var tablero = [
  ["#", "#", "#"],
  ["#", "#", "#"],
  ["#", "#", "#"],
];
var jugadores = []; //Simbolo -> id de ws
var ws = []; //id de ws -> ws
var simbolos = ["X", "O"]; //Simbolos disponibles
var simbolo_asignado = []; //id de ws -> simbolo
var estado_juego = ""; //'X' Gano jugador x; 'O' Gano jugador o;'D' Empate; '' juego en curso.
var ronda = 0;

let networkInterfaces = os.networkInterfaces();
let address;
var args = process.argv.slice(2);
if(args[0]){
  address = networkInterfaces[args[0]][0].address;
}else{
  let name = Object.keys(networkInterfaces)[1];
  address = networkInterfaces[name][0].address;
}
let content = `const server = "http://${address}";
const port = "3000";
const url = server + ":" + port;
const debug = true;`;

fs.writeFile("public/js/constantes.js", content, function (err) {
  if (err) throw err;
});
console.log(`Ip privada del servidor: ${address}`);
//-------------------- FIN INICIALIZACION-----------------

//--------------------- EVENTOS TA-TE-TI------------------
io.on("connection", (wsTateti) => {
  let id = wsTateti.id;
  if (debug) {
    console.log("New client connected. ID: ", id);
  }
  ws[id] = wsTateti;
  // Asignamos 'X' o 'O' al cliente que se conecta
  if (simbolos.length > 0) {
    let s = simbolos.pop();
    jugadores[s] = id;
    simbolo_asignado[id] = s;
  }
  // Si no existen mas simbolos -> se comienza la partida
  if (simbolos.length == 0) {
    if (Object.keys(ws).length == 2) {
      io.emit("mostrar_tablero");
      //Asigna un turno a un jugador aleatorio (puede ser X o O)
      let jugador_inicial = random_item(jugadores);
      jugador_inicial = ws[jugador_inicial];
      jugador_inicial.emit("turno_jugador", JSON.stringify("{}"));
      turno = simbolo_asignado[jugador_inicial.id];
      if (debug) {
        console.log(turno);
      }
    } else {
      // Ya existen dos jugadores, no hay mas cupo.
      wsTateti.emit("sala_llena");
    }
  }
  if (debug) {
    console.log(simbolo_asignado[id] + " - " + Object.keys(simbolos).length);
  }
  wsTateti.emit("asignacion_simbolo", JSON.stringify(simbolo_asignado[id]));

  wsTateti.on("disconnect", () => {
    if (debug) {
      console.log("Client disconnected. ID: ", wsTateti.id);
    }
    delete ws[wsTateti.id]; // Eliminamos el websocket registrado
    if(simbolo_asignado[wsTateti.id]){
      // El cliente tiene un simbolo asignado -> es un jugador
      simbolos.push(simbolo_asignado[wsTateti.id]); // Volvemos a poner disponible el simbolo
      delete jugadores[simbolo_asignado[wsTateti.id]]; // Eliminamos la relacion simbolo-ws.id
      delete simbolo_asignado[wsTateti.id]; // Eliminamos la relacion ws.id-simbolo
      // Aviso de desconexion al otro jugador (broadcast)
      io.emit("clientdisconnect", id);
      if (simbolos.length == 2) {
        reiniciar_partida();
      }
    }
  });
  //
  wsTateti.on("jugar_turno", function (
    req,
    movimiento_valido //request[i:fila;j:columna;p:jugador]
  ) {
    var request = JSON.parse(req);
    if (debug) {
      console.log(request);
    }
    idSocket = request.p;
    simbolo = simbolo_asignado[idSocket];
    //verificar si es mi turno
    if (turno == simbolo) {
      fila = parseInt(request.i);
      columna = parseInt(request.j);

      //seleccionar casilla
      if (tablero[fila][columna] == "#") {
        if (debug) {
          console.log("La casilla esta vacía");
        }
        // ACK de que el movimiento fue posible
        movimiento_valido(true);

        tablero[fila][columna] = simbolo;
        ronda += 1;

        verificar_ganador();

        //verificar si hay empate
        if (estado_juego == "") {
          if (ronda == 9) {
            estado_juego = "D";
          }
        }
        if (debug) {
          console.log("Por chequear Game Over");
        }
        //dispara game over.
        if (estado_juego != "") {
          let mensaje = {};
          if (debug) {
            console.log(estado_juego);
          }
          if (estado_juego == "D") {
            mensaje.resultado = "¡Tenemos un empate!";
            io.emit("game_over", JSON.stringify(mensaje));
          } else {
            for (var key in ws) {
              if (key == jugadores[estado_juego]) {
                mensaje.resultado =
                  "\u{1F973} \u{1F389} ¡Has ganado! \u{1F389} \u{1F973}";
              } else {
                mensaje.resultado =
                  "\u{1F644} \u{1F641} ¡Has perdido! \u{1F641} \u{1F644}";
              }
              ws[key].emit("game_over", JSON.stringify(mensaje));
            }
            // Limpiar tablero;
            reiniciar_partida();
          }
        }
        if (debug) {
          console.log("No es game over");
        }
        // se notifica el ultimo movimiento
        let ultimo_movimiento = {};
        ultimo_movimiento.fila = fila;
        ultimo_movimiento.columna = columna;
        ultimo_movimiento.simbolo = simbolo;
        if (simbolo == "X") {
          otro_jugador = jugadores["O"];
          turno = "O";
        } else {
          otro_jugador = jugadores["X"];
          turno = "X";
        }
        ws[otro_jugador].emit(
          "turno_jugador",
          JSON.stringify(ultimo_movimiento)
        );
        if (debug) {
          console.log(ultimo_movimiento);
        }
      } else {
        movimiento_valido(false);
      }
    }
  });

  wsTateti.on("game_over", function (request) {
    // se avisa a los jugadores que el juego termino
    reiniciar_partida();
  });
});

function reiniciar_partida() {
  tablero = [
    ["#", "#", "#"],
    ["#", "#", "#"],
    ["#", "#", "#"],
  ];
  estado_juego = "";
  ronda = 0;
}
function verificar_ganador() {
  // Verificar 3 en linea vertical
  if (
    tablero[0][0] == tablero[1][0] &&
    tablero[1][0] == tablero[2][0] &&
    tablero[2][0] != "#"
  ) {
    if (debug) {
      console.log("Pimer if");
      console.log(tablero[0][0]);
    }
    estado_juego = tablero[0][0];
  } else {
    if (
      tablero[0][1] == tablero[1][1] &&
      tablero[1][1] == tablero[2][1] &&
      tablero[2][1] != "#"
    ) {
      estado_juego = tablero[1][1];
    } else {
      if (
        tablero[0][2] == tablero[1][2] &&
        tablero[1][2] == tablero[2][2] &&
        tablero[2][2] != "#"
      ) {
        estado_juego = tablero[2][2];
      }
    }
  }
  // verificar 3 en linea horizontal
  if (estado_juego == "") {
    if (
      tablero[0][0] == tablero[0][1] &&
      tablero[0][1] == tablero[0][2] &&
      tablero[0][2] != "#"
    ) {
      estado_juego = tablero[0][0];
    } else {
      if (
        tablero[1][0] == tablero[1][1] &&
        tablero[1][1] == tablero[1][2] &&
        tablero[1][2] != "#"
      ) {
        estado_juego = tablero[1][1];
      } else {
        if (
          tablero[2][0] == tablero[2][1] &&
          tablero[2][1] == tablero[2][2] &&
          tablero[2][2] != "#"
        ) {
          estado_juego = tablero[2][2];
        }
      }
    }
  }

  //verificar 3 en linea diagonal
  if (estado_juego == "") {
    if (
      tablero[0][0] == tablero[1][1] &&
      tablero[1][1] == tablero[2][2] &&
      tablero[2][2] != "#"
    ) {
      estado_juego = tablero[0][0];
    }
    if (
      tablero[0][2] == tablero[1][1] &&
      tablero[1][1] == tablero[2][0] &&
      tablero[2][0] != "#"
    ) {
      estado_juego = tablero[1][1];
    }
  }
}

function random_item(items) {
  let keys = Object.keys(items);
  let i = keys.length;
  let random = Math.floor(Math.random() * i);
  return items[keys[random]];
}

server.listen(3000);
//-------------------- FIN EVENTOS TA-TE-TI -----------------
