var apn = require("apn"), options, connection, notification;
var FCM = require('fcm').FCM;

    var options = {
        "cert": "projectSnapp.pem",
        "key": "projectSnapp.pem",
        "passphrase": "Mobiloitte1",//Acropole
        "gateway": "gateway.sandbox.push.apple.com",
        "port": 2195,
        "enhanced": true,
        "cacheLength": 5
    };

module.exports={
   "iosPush":function(token,data){
    console.log("data",data.type);
          var deviceToken = token ;
          console.log("deviceToken",deviceToken)
                    var apnConnection = new apn.Connection(options);
                    var myDevice = new apn.Device(deviceToken);
                    var note = new apn.Notification();
                    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
                    note.badge = 1;
                    note.sound = "ping.aiff";
                    note.alert = data.message;
                    note.payload = data/*{
                        "receiverImage":data.receiverImage,
                        "otheruserid": data.senderId,
                        "type": data.type,
                        "userName":data.senderName
                    };*/
                    try {
                        apnConnection.pushNotification(note,myDevice);//devicIos
                        apnConnection.on('transmitted', function(notification, deviceToken) {
                            console.log('APNS: Successfully transmitted message' + JSON.stringify(notification));
                        });

                    } catch (ex) {
                        console.log("in Error");
                        console.log(ex);
                    }
                 //  console.log('iOS Push Notification send');
   },
"androidPush": function(deviceToken,data) {
    console.log("andriod nitification function started",JSON.stringify(data))
//var serverKey = 'AIzaSyBTfXFq-OpKa7tTqGWHHUNAfcyyIA3jyGI';
var serverKey = 'AAAARBWjjMU:APA91bHU9h72JJtUweXNi8vUABHEIAjJFjCOD6nX-llCNjl3yoApfp4MH6e-Zi6MGrF1tYZU2vUBQEoxbKCX2GKi56PJSxOqRyiy86MvfeHeP4PKoqnZuEIDQ5vIJfz006QQjv9FamS5'
var title="title";
var fcm = new FCM(serverKey);
var message={ 
    to: deviceToken, 
    // collapse_key: 'your_collapse_key',
    
    notification: {
        title: 'Transportation app', 
        body: data.message,
        messageType :"chat_notification"
    },
    
    data: JSON.stringify(data)
    
};

fcm.send(message, function(err, response){
   if (err) {
       console.log("Something has gone wrong!...............######");
        //res.send({responseCode:500,responseMessage:"success"});
       console.log("errror"+err);
   } else {
      //res.send({responseCode:200,responseMessage:"success"});
       console.log("Successfully sent with response: "+response);
   }
});

}

/*'android_push':function(device_token,msg) {
        console.log("device_token----"+device_token);
        console.log('message'+msg);
        var serverKey = 'AAAAbh2qeO8:APA91bGV06rA6Pj_O3HLBYseyg6d0W6Jo2wlwV1uU_s636Co9r7YBJDvtqpbUZZW3ZTsSBnRj45zKFpTCxBZyiXOWfJiOMBaruZgXdSuOzwQV5pqslAJw5AkL6QN-_g2nr6ioEA3U7St';
            var title=title;
                    var fcm = new FCM(serverKey);
                    var message={ 
                        to: device_token, 
                        collapse_key: 'your_collapse_key',   
                        // notification: {
                        //     title: 'Title of your push notification', 
                        //     body: 'Body of your push notification' 
                        // },   
                        data: {
                            title :'Helposity'
                            , message : msg
                        }
                    };
                fcm.send(message, function(err, response){
                   if (err) {
                       console.log("error-->"+err);
                   } else {
                       console.log('Android notification sent Successfully');
                       console.log("Successfully sent with response: "+response);
                   }
        });
    }

}*/
  
};