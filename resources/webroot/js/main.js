// EventBus

var eb = new EventBus("/eventbus/");
var sender_id = Math.floor(Math.random() * 10000);
var sender = "client." + sender_id.toString();
document.getElementById('player').innerHTML += `${sender}`;


eb.onopen = function () {

  eb.registerHandler(sender, function (err, msg) {
    
    let message = null;
    try {
        message = JSON.parse(msg.body); 
    } catch (e) {
      message = msg.body;
    }
    

    if (message.type == "chat") {
      let li = document.createElement('li');
      if (message.sender != sender && message.sender != "Server") {
        li.innerHTML += `<span>${message.sender}: </span> ${message.content}`;
      }
      else if (message.sender == "Server"){
        li.innerHTML += `<i class="fas fa-info-circle"></i><span> ${message.content}</span>`;
      }
      else {
        li.innerHTML += `<span>You: </span> ${message.content}`;
      }
      document.querySelector('#messages_ul').append(li);

    }
    else if (message.type == "clear_canvas") {

      if (message.sender != sender) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    else if (message.type == "word") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let task = document.getElementById('task');
      //let span_state = document.getElementById('game_state');
      //let span_role = document.getElementById('role');


      task.innerHTML = '';
      task.innerHTML = `${message.content}`;

      if (message.role == "host") {
        $("#canvas").removeClass("spectator");
        $("#palette_controllers").removeClass("spectator");

      }
      else {
        $("#palette_controllers").addClass("spectator");
        $("#canvas").addClass("spectator");
      }


      //$('#info').fadeIn().delay(600).fadeOut();


      
    }
    else if (message.type == "canvas") {
        if (message.sender != sender) {
          draw(message.line, message.stroke_width, message.stroke_color);
        }
    }
    else if (message.type == "ping") {
        eb.send("ping", "client." + sender_id)
    }
    });
};

$("#msg_input").submit(function (event) {
  event.preventDefault();
    var message = $('#input').val();

    if (message.length > 0) {
      let chat_msg = {
        type: "chat",
        sender: sender,
        content: message
      }
      eb.send("to.server", JSON.stringify(chat_msg));
      $('#input').val("");
    }
});

// Canvas

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
var stroke_color = "#4E4D62";
var stroke_width = 5;
var isDrawing = false;
var lastPoint = { x: 0, y: 0 };
var canvas_content = { x1: 0, y1: 0, x2: 0, y2: 0};

resizeCanvasToDisplaySize(ctx.canvas);

function resizeCanvasToDisplaySize(canvas) {
   const width = canvas.clientWidth;
   const height = canvas.clientHeight;

   if (canvas.width !== width || canvas.height !== height) {
     canvas.width = width;
     canvas.height = height;
     return true;
   }

   return false;
}

function color(obj) {
    switch (obj.id) {
        case "standard":
            stroke_color = "#4E4D62";
            break;
        case "red":
            stroke_color = "#e74c3c";
            break;
        case "orange":
            stroke_color = "#e67e22";
            break;
        case "green":
            stroke_color = "#2ecc71";
            break;
        case "blue":
            stroke_color = "#3498db";
            break;
        case "purple":
            stroke_color = "#9b59b6";
            break;
        case "white":
            stroke_color = "white";
            break;
    }
    
    if (stroke_color == "white") stroke_width = 20;
    else stroke_width = 5;
}

canvas.addEventListener("mousedown", function(event) {
  lastPoint = { x: event.offsetX, y: event.offsetY};
  canvas_content = { x1: lastPoint.x, y1: lastPoint.y, x2: event.offsetX, y2: event.offsetY};
  isDrawing = true;
});

canvas.addEventListener("mousemove", function(event) {
  if (isDrawing === true) {
    draw(canvas_content, stroke_width, stroke_color);
    canvas_content = { x1: lastPoint.x, y1: lastPoint.y, x2: event.offsetX, y2: event.offsetY};
    lastPoint = { x: event.offsetX, y: event.offsetY};
    eb.send("to.server", JSON.stringify({
    sender: sender, 
    type: "canvas", 
    line: canvas_content,
    stroke_color: stroke_color,
    stroke_width: stroke_width
  }));
  }
});

canvas.addEventListener("mouseup", function(event) {
  draw(canvas_content, stroke_width, stroke_color);
  lastPoint = { x: 0, y: 0};

  isDrawing = false;
});

function draw(canvas_content, stroke_width, stroke_color) {
  ctx.beginPath();
  ctx.lineWidth = stroke_width;
  ctx.lineCap = "round";
  ctx.strokeStyle = stroke_color;
  ctx.moveTo(canvas_content.x1, canvas_content.y1);
  ctx.lineTo(canvas_content.x2, canvas_content.y2);
  ctx.stroke();
}

var clear_var = document.getElementById("clear");
clear_var.onclick = clear;

function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  eb.send("to.server", JSON.stringify({
    sender: sender,
    type: "clear_canvas"
  }))
};