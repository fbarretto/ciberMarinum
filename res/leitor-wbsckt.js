const socket = new WebSocket('ws://localhost:8025/');

// Abrir conexão
socket.addEventListener('open', function (event) {
  socket.send('Ola!');
});

socket.addEventListener('message', function (event) {
  let data = event.data.split(",");

  // imprime variáveis
  console.log('Sensor 1:', data[0], 'Sensor 2:', data[1]);

  // atualiza variáveis
  for (let i = 0; i < data.length; i++) {
   sensor[i] = parseFloat(data[i]);
  }
});

