'use strict';

// angular.module('chatclient', [])
//   .factory('GUI', function() {
//     return require('nw.gui');
//   })
//   .factory('Window', ['GUI', function(gui) {
//     return gui.Window.get();
//   }])
//   .controller('Toolbar', ['$scope', 'Window',
//     function($scope, Window) {
      /*
      
      Custom Control for Window operations

      $scope.minimize = function() {
        Window.minimize();
      };

      $scope.toggleFullscreen = function() {
        Window.toggleKioskMode();
      };

      $scope.close = function() {
        Window.close();
      };*/
  //   }
  // ]);

// app.js
// require.nodeRequire = window.requireNode;
//Load angular
var app = angular.module('chatClient', ['ngMaterial', 'ngAnimate', 'ngMdIcons', 'btford.socket-io']);

//Set our server url
var serverBaseUrl = 'http://localhost:8085';

//Services to interact with nodewebkit GUI and Window
app.factory('GUI', function () {
    //Return nw.gui
    // require(['require', 'name'], function (require) {
    //     var namedModule = require('name');
    // });
    // return require(['nw.gui'], function(dependency) {});
    return require('nw.gui');
});
// define(function(require) {
//     var GUI = require('nw.gui');
// });
app.factory('Window', function (GUI) {
    return GUI.Window.get();
});

//Service to interact with the socket library
app.factory('socket', function (socketFactory) {
    var myIoSocket = io.connect(serverBaseUrl);

    var socket = socketFactory({
        ioSocket: myIoSocket
    });

    return socket;
});



//ng-enter directive
app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

//Our Controller 
app.controller('MainCtrl', function ($scope, Window, GUI, $mdDialog, socket, $http){
  //Menu setup
    //Global Scope
  $scope.messages = [];
  $scope.room     = "";

  //Build the window menu for our app using the GUI and Window service
  var windowMenu = new GUI.Menu({
      type: 'menubar'
  });
  var roomsMenu = new GUI.Menu();

  windowMenu.append(new GUI.MenuItem({
      label: 'Rooms',
      submenu: roomsMenu
  }));

  windowMenu.append(new GUI.MenuItem({
      label: 'Exit',
      click: function () {
          Window.close()
      }
  }));


  //console if user joined
  socket.on('user joined', function(data) {
    console.log(data.username + " has joined" + " in room " + data.room);
  })
  //Listen for the setup event and create rooms
  socket.on('setup', function (data) {        
      var rooms = data.rooms;

      for (var r = 0; r < rooms.length; r++) {
          //Loop and append room to the window room menu
          handleRoomSubMenu(r);
      }

      //Handle creation of room
      function handleRoomSubMenu(r) {
          var clickedRoom = rooms[r];
          //Append each room to the menu
          roomsMenu.append(new GUI.MenuItem({
              label: clickedRoom.toUpperCase(),
              click: function () {
                  //What happens on clicking the rooms? Swtich room.
                  $scope.room = clickedRoom.toUpperCase();
                  //Notify the server that the user changed his room
                  socket.emit('switch room', {
                      newRoom: clickedRoom,
                      username: $scope.username
                  });
                  //Fetch the new rooms messages
                  $http.get(serverBaseUrl + '/msg?room=' + clickedRoom).success(function (msgs) {
                      $scope.messages = msgs;
                  });
              }
          }));
      }
      //Attach menu
      GUI.Window.get().menu = windowMenu;
  });


  //Change room
  $scope.changeRoom = function (clickedRoom) {
      $scope.room = clickedRoom.toUpperCase();
      socket.emit('switch room', {
          newRoom: clickedRoom,
          username: $scope.username
      });
      $http.get(serverBaseUrl + '/msg?room=' + clickedRoom).success(function (msgs) {
          $scope.messages = msgs;
      });
  };
  //Modal setup
    // Ask for the username
  $scope.usernameModal = function (env) {
      //Launch Modal to get username
      $mdDialog.show({
          controller: UsernameDialogController,
          templateUrl: 'partials/username.tmpl.html',
          parent: angular.element(document.body),
          targetEvent: env,
      })
      .then(function (username, room) {
          //Set username with the value returned from the modal
          $scope.username = username;
          
          //Set room to the value returned from the modal;
          $scope.room = room;

          //Tell the server there is a new user
          socket.emit('new user', {
              username: answer,
              room: room
          });
          //Fetch chat messages in Tech Bay
          $http.get(serverBaseUrl + '/msg?room=' + $scope.room).success(function (msgs) {
              $scope.messages = msgs;
          });
      }, function () {
          Window.close();
      });
  };

  //listen for new message
  //Listening for new messsage
    socket.on('message created', function (data) {
        //Push to new message to our $scope.messages
        $scope.messages.push(data);
        //Empty the textarea
        $scope.message = "";
    });

  //Notify server of the new message
  //Send a new message
    $scope.send = function (msg) {
        //Notify the server that there is a new message with the message as packet
        socket.emit('new message', {
            room: $scope.room,
            message: msg,
            username: $scope.username
        });

    };
}); 

//Dialogue Controller
function UsernameDialogController($scope, $mdDialog) {
    $scope.answer = function (answer) {
        $mdDialog.hide(answer);
    };
}