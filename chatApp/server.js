var express = require('express');
var mongoose = require('mongoose');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);


// static files served from public
app.use(express.static(__dirname + '/public'));

//connecting to mongodb
mongoose.connect("mongodb://127.0.0.1:27017/ChatDB");

//defining schema for chat application
var schema = mongoose.Schema({
	created : Date,
	username : String,
	content : String,
	room : String
});

//creating model
var chat = mongoose.model('chat', schema);

//allowing cross origin resource sharing
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
	if (req.method == 'OPTIONS') {
		res.status(200).end();
	} else {
		next();
	}
});


/**		Declaring the routes	**/

//route for the index file
app.get('/', function(req, res) {
	res.sendfile('index.html');
});

//route the run the chat history in the first launch
app.post('/setup', function(req, res) {
	//array of chat data
	var chatData = [{
		created : new Date(),
		username : "Jayant",
		content : "Hi",
		room : "Tech Bay"
	}, {
		created : new Date(),
		username : "Bala",
		content : "Hello",
		room : "Fashion Bay"
	}, {
		created : new Date(),
		username : "Sumit",
		content : "Wassup",
		room : "HR Bay"
	}];

	//Insert the chats to the database
	for(var i=0;i<chatData.length; i++) {
		var newChat = new chat(chatData[i]);
		newChat.save(function(err, savedChat) {
			console.log(savedChat);
		});
	}

	res.send("Inserted...");
});

//route to produce a ist of chat as filtered by the room
app.get('/msg', function(req, res) {
	chat.find({
		'room' : req.query.room.toLowerCase()
	}).exec(function(err, msgs) {
		res.json(msgs);
	});
});

/** End of routes **/




/**		Socket Conenction	**/
//Listen for connection
io.on('connection', function(socket) {
	var defaultRoom = 'Tech Bay';
	var rooms = ["Tech Bay", "Fashion Bay", "HR Bay"];

	//emit rooms array
	socket.emit('setup', {
		rooms : rooms
	});

	//listen for the new user
	socker.on('new user', function(data) {
		data.room = defaultRoom;

		//new user joins the default room
		socket.join(defaultRoom);

		//tell all those in the room that a new user has joined...
		io.in(defaultRoom).emit('user joined', data);
	});

	//listen for switch room
	socket.on('switch room', function(data) {
		//handles joining and leaving rooms
		//console.log(data);
		socket.leave(data.oldRoom);
		socket.join(data.newRoom);
		io.in(data.oldRoom).emit('user left', data);
		io.in(data.newRoom).emit('user joined', data);
	});

	//listens for a new chat message
	socket.on('new message', function(data) {
		//create message
		var newMsg = new chat({
			username : data.username,
			content : data.message,
			room : data.room.toLowerCase(),
			created : new Date()
		});

		//save the message to the database
		newMsg.save(function(err, msg) {
			//send message to those connected in the room
			io.in(msg.room).emit('message created', msg);
		});
	});
});
/** 	Socket ends		**/


server.listen(8085);
console.log("server is listening on port 8085");