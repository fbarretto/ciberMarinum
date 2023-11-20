const socket = new WebSocket('ws://localhost:8025/');

// Abrir conexão
socket.addEventListener('open', function (event) {
  socket.send('Ola!');
});

socket.addEventListener('message', function (event) {
  /**
   * Represents the data obtained from the event.
   * @type {string[]}
   */
  let data = event.data.split(",");

  // imprime variáveis
  console.log('Sensor 1:', data[0], 'Sensor 2:', data[1]);

  // atualiza variáveis
  for (let i = 0; i < data.length; i++) {
    //ease in
   sensor[i] += (parseFloat(data[i]) - sensor[i])*0.1;
  }
});

