var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');
var waterfall = require('async-waterfall');
var chatHistory = require('./db_repo/chatHistory.js');
var Room = require('./db_repo/room.js');
var User = require('./db_repo/chatUser.js');
var fs = require('fs');
var path=require('path');
var _ = require('underscore');
var bodyParser = require('body-parser');
var notify = require('./push_master/push.js');
app.use(bodyParser.json({limit: "50mb"}));

//var config = require('./config');

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/eventdriven");

/*Access-Control-Allow-Headers*/
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});
 app.get('/',(req, res)=>{
   /*var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;*/
  var message =  "Please Use the following URL for connect socket "+req.protocol + '://' + req.get('host') + req.originalUrl
  res.send(message)
 })



var sockets={};
var onlineUsers ={};


     io.sockets.on('connection', function(socket){

       console.log("\x1b[31m","Congratulation connection has been established");

        socket.on('initChat', function(data){
          console.log("initChat created....."+JSON.stringify(data));

          User.findOne({userId:data.userId}, function(err, result){
           // console.log("result data of init chat--->"+result);
             if(result == null || result=="" || result == undefined){
                              var user = new User(data);
                              user.save(function(err){
                                if(err) return err;
                              })
                            } else{                 
                                User.update({userId: data.userId},{ $set: {
                                                                         
                                    deviceToken: data.deviceToken,
                                    profilePic:data.profilePic
                                   }
                              }, function(err, results){
                                 if(err) return err;
                                 console.log("initChat>>>>",results);
                               
                               });
                           }
          })
              sockets[socket.id] = { data :data, socket : socket };
        if (!(data.userId in onlineUsers)) {
                onlineUsers[data.userId]= {socketId:[socket.id],userId:data.userId, userName: data.userName, status:"online"};
            }
            else {
                  onlineUsers[data.userId].socketId.push(socket.id)
                 }  

                //onlineUsers[data.userId]= {socketId:[socket.id],userId:data.userId, userName: data.userName, status:"online"};

                console.log('Online Users---->'+JSON.stringify(onlineUsers));

        })
//----------------------------------------User Status---------------------------------------------------------------//
        socket.on('userStatus', function(data){ //userId and status
          console.log("userStatus- data---- ", JSON.stringify(data));
          if(onlineUsers[data.userId] == undefined){
            console.log("user is offline");
          }else{
            var members = [];
            onlineUsers[data.userId].status = data.status;
            socket.broadcast.emit(data.userId+ " is " + data.status);
            console.log("user status----", JSON.stringify(onlineUsers[data.userId]));
          }
        });

//---------------------------------------------Online User ----------------------------------------------------------//
        socket.on('isOnline', function(data){   //userId and receiverId
              console.log("isOnline data-------"+JSON.stringify(data));
              var userStatus;
              if(onlineUsers[data.receiverId] == undefined){
                userStatus = "Offline";
              }else{
                userStatus = onlineUsers[data.receiverId].status;
              }

                  if(onlineUsers[data.userId]== undefined){
                    console.log("sender is offline")

                  } else{
                    sockets[onlineUsers[data.userId].socketId].socket.emit('onlineStatus', userStatus);
                  }
        });

 //------------------------------------------ Send Message -----------------------------------------------------//  
        socket.on('sendmessage', function(data){
          console.log("===================")
        var timeStamp = Date.now();
        var utcDate = new Date();
        var participants = [data.receiverId,data.senderId]
        var query = {activeUsers:{$all:participants}}
        waterfall([
          function(callback){
             Room.findOne(query,function(err,result){
             if(result == null || result=="" || result == undefined){
              var addParticipents =[]
              for(var i = 0 ; i < participants.length ; i++){
                addParticipents.push({userId:participants[i]})
              } 
               var room = new Room({activeUsers:participants,participants:addParticipents,chatType:"single"});
                          room.save(function(err, roomResult){
                            console.log("Room saved");
                            if(err){
                              console.log("Something went wrong in room creation",err)
                            }else{
                              callback(null,roomResult._id)
                            }
                         })          
             }else{
                              callback(null,result._id)
             } 
        }) 
      },
      function(roomId,callback){
                   var roomId = roomId    
      //console.log("data for chat history>>>",data)
                  var saveChat = new chatHistory(data);
                      saveChat.roomId = roomId
                      saveChat.save(function(err, result){
                        if(err){
                          console.log("Something went wrong in chat history saving",err)
                        }else{
                          console.log("chat history saved successfully");
                        }
                      }) 
                      callback(null,roomId)
                    },function(roomId,callback){
                      console.log("DAta",data);
                     var requireData = {
                      messageType:data.messageType,
                      message:data.message,
                      senderId:data.senderId,
                      senderImage:data.senderImage,
                      receiverId:data.receiverId,
                      receiverImage:data.receiverImage,
                      media:data.media,
                      senderName:data.receiverName,
                      receiverName:data.senderName,
                      timeStamp:utcDate,
                      senderImage:data.senderImage,
                      profilePic:data.profilePic
                     }
                    // if(onlineUsers[data.senderId] == undefined){
                    //   console.log("sender is offline");
                    // }
                    // else{
                    //   sockets[onlineUsers[data.senderId].socketId].socket.emit("receivemessage",{requireData});
                    //      }
                      if(onlineUsers[data.receiverId] == undefined || onlineUsers[data.receiverId].status == "Away"){
                           console.log("receiver is offline>>>>"+data.receiverId)
                          //  sockets[onlineUsers[data.receiverId].socketId].socket.emit("receivemessage",{requireData} );
                          console.log("==============="+ JSON.stringify(onlineUsers)) 
                          User.findOne({userId:data.receiverId},function(err, result){
                            console.log("result>>>",result)
                            // if(err)console.log("error")
                            console.log("hi==============>",typeof result.deviceType)
                              if(result.deviceType == 'Android'){
                                console.log("inside if ####")
                                // result.deviceType == "ios" ? notify.iosPush(result.deviceToken,requireData) : notify.androidPush(result.deviceToken,requireData);     
                                notify.androidPush(result.deviceToken,requireData);      
                           }
                          })          
                          }else{
                             console.log("inside the receivemessage")
                            //  for(var i = 0 ; i < onlineUsers[data.receiverId].socketId.length ; i++ ){
                                 sockets[onlineUsers[data.receiverId].socketId].socket.emit("receivemessage",{requireData} ); 
                                //  }             
                             }
                     } 
            ])
                } )
                                     
          /*                   if(onlineUsers[data.receiverId] == undefined){
                              console.log("push notification");
                              user.find({userId:data.receiverId}, function(err, result){
                                var message = data.message;
                                if(result[0]= null || result[0]=="" || result[0]== undefined){
                                  console.log("No user registered of this userID");
                                }
                               else {
                                    iOS_notification(result[0].deviceToken,message);
                                  }   172.16.1.35
                              })
                               sockets[onlineUsers[data.senderId].socketId].socket.emit("offlineReceiver", {message: "Receiver is offline", userId: data.receiverId, chatRoomId:chatRoomId});
                             } else{
                              sockets[onlineUsers[data.senderId].socketId].socket.emit("onlineReceiver", {message: "Receiver is online", userId: data.receiverId, chatRoomId:chatRoomId});
                              sockets[onlineUsers[data.receiverId].socketId].socket.emit("receivemessage",{data, chatRoomId:chatRoomId} );
                             }*/

//------------------------------------------ on Disconnect -------------------------------------------------------------//                              
    socket.on('disconnect',function(){

            var socketId = socket.id;
            console.log("socket id in disconnected--"+socketId);
            console.log("socket id in disconnect111111111111111111111--"+sockets[socketId]);

          
              if(sockets[socketId] != undefined){
                 delete onlineUsers[sockets[socketId].data.userId];
                 //onlineUsers[sockets[socketId].data.userId].socketId.pop(socket.id)

                  console.log(" users deleted"+JSON.stringify(onlineUsers));
               } else{
                console.log("not deleted-----");
               }

             console.log('connection disconnected---->'+ socketId);
          })

   /* socket.on('isread', function(data){ chatRoomId, 
        


    })*/
 //------------------------------------------ Read Message -------------------------------------------------------------//  
        socket.on('readMessage', function(data){  //need chatRoomId, lastmsgId, senderId, receiverId
          console.log("readMessage DATa????",data);
                    var query = {$or:[{$and:[{senderId:data.senderId},{receiverId:data.receiverId}]},{$and:[{senderId:data.receiverId},{receiverId:data.senderId}]}]}
                  Room.findOne(query,function(err,result){
                     if(result==null || result=="" || result== undefined){console.log("users doesnot exist")}
                      else{
                         Model = generateTableName(result.chatRoomId);
                         Model.update({ lastmsgId :{$lte:data.lastmsgId}, receiverId: data.receiverId}, {
                      $set: 
                      {
                        status: 'READ'
                      }
                     },{multi: true}, function(err, result){

                      console.log("Messages above last Message ID  "+data.lastmsgId+" has been read by the Receiver "+data.receiverId);
                   })

                   if(onlineUsers[data.senderId]== undefined){
                       console.log("sender is offline");

                   } else{
                       sockets[onlineUsers[data.senderId].socketId].socket.emit("messageRead", data);
                   }
                      }
                  })       
        })
 })
 //------------------------------------------ Helper Functions -------------------------------------------------------------//  
 
function chatTrue(orderId, mealId){
  console.log("Yo betttaaaaa>>"+orderId,mealId)
  OrderList.findOneAndUpdate({_id:orderId,'meal.mealId':mealId},{$set:{'meal.$.chatStatus':true}},{new:true},function(err, result){
    if(err)console.log("error")
      console.log("update true>>>>>>>>>>>>>>>>>>>>>>>>>"+result)
  })
}


 function uploadImage(images,callback){
  console.log("uploadImage function");
      if (!(images === undefined || images == "")) {
          var imageUrl = [];
          var a = 0;
          for (var i = 0; i < images.length; i++) {
              var img_base64 = images[i];
              binaryData = new Buffer(img_base64, 'base64');
              require("fs").writeFile("test.jpeg", binaryData, "binary", function(err) {});
              cloudinary.uploader.upload("test.jpeg", function(result) {
                  if (result.url) {
                      imageUrl.push(result.url);
                      a += i;
                      if (a == i * i) {
                          callback(null, imageUrl);
                      }
                  } else {
                      callback(null,'http://res.cloudinary.com/ducixxxyx/image/upload/v1480150776/u4wwoexwhm0shiz8zlsv.png')
                  }

              });
          }
      } else {
          callback(null,"http://res.cloudinary.com/ducixxxyx/image/upload/v1480150776/u4wwoexwhm0shiz8zlsv.png");
      }
 }


app.post('/ChatHistory', function(req, res){  //need receiverId, senderId, pageNumber

var query = {$or:[{$and:[{senderId:req.body.senderId},{receiverId:req.body.receiverId},{hidden:{$ne:req.body.senderId}}]},{$and:[{receiverId:req.body.senderId},{senderId:req.body.receiverId},{hidden:{$ne:req.body.senderId}}]}]}

console.log(JSON.stringify(query))

chatHistory.paginate(query,{sort: { time: -1 }, page: req.body.pageNumber, limit: 20  }).then(function(result){
    res.send({responseCode: 200, responseMessage: "Data Found successfully.",chatResult: result});  
})

})

app.post('/deleteMessage', function(req,res) {
  console.log("req.body: ",req.body)
    chatHistory.findByIdAndUpdate(req.body.messageId,{$push:{hidden:req.body.userId}},{new:true})
    .then((success)=> res.send({responseCode: 200, responseMessage: "Successfully Updated."}))
    .catch((error)=> res.send({responseCode: 500, responseMessage: "Something went wrong."}))
})

app.post('/deleteAllMessages', function(req,res) {
  
    chatHistory.findOneAndUpdate({roomId:req.body.roomId},{$addToSet:{hidden:req.body.userId}},{new:true},{multi:true})
    .then((success)=> res.send({responseCode: 200, responseMessage: "Successfully Updated."}))
    .catch((error)=> res.send({responseCode: 500, responseMessage: "Something went wrong."}))
})


app.post('/testPush',function(req, res){
  var requireData = {
    name: "rinku",
    sdsd:"sdsdsdsds"
  }
  notify.androidPush(req.body.deviceToken,requireData)
})

'use strict';
app.post('/logoutApi', function(req, res){
  User.findOneAndUpdate({userId:req.body.userId},{$set:{deviceToken:null}},function(err,result){
    if(err){
                  res.send({ responseCode: 403, responseMessage: 'Something went wrong'});

    }else{
                  res.send({ responseCode: 200, responseMessage: 'Logout successfully'});

    }
  })
})
app.post('/userConversionList', function (req, res) {
  var userId = req.body.userId;
  User.find().sort({createdAt:-1}).exec(function (err, result) {
    if (err) {
      res.send(err);
    } else {
      var userList = [],
          counter = 0,
          len = result.length;
      _.each(result, function (sq) {
        var query = { $and: [{ $or: [{ senderId: userId }, { receiverId: userId }] }, { $or: [{ senderId: sq.userId }, { receiverId: sq.userId }] }] };
        chatHistory.findOne(query, function (err, chatResult) {
          if (err) {
            res.send({ responseCode: 401, responseMessage: 'Something went wrong', err: err });
          } else {
            if (chatResult && userId != sq.userId ) {
              console.log(chatResult);
              userList.push({
                participant_id:sq.userId,
                userName: sq.userName,
                profilePic: sq.profilePic,
                message_type:chatResult.messageType,
                lastMsg: chatResult.message,
                time: chatResult.time
              });
            }
          }
          if (++counter == len) {
           var pageNumber = req.body.pageNumber || 1,
               maxResult = 10,
               start = (pageNumber*maxResult) - maxResult,
               end = pageNumber*maxResult,
               totalPage = Math.ceil(userList.length/maxResult)
           var dataList = userList.splice(start,end)
           var data = {
            data: dataList,
            pageNumber:pageNumber,
            totalPage:totalPage
           }
            res.send({ responseCode: 200, responseMessage: 'list found', result: data });
          }
        }).sort({time:-1});
      });
    }
  });
});

server.listen(8088, function(){
 console.log(' chat Server is listening on ',server.address().port);
});
