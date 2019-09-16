
 /**
  * Require MongoDB native node client to keep chat history.
  * 
  * @const  number   requires mongodb as database client
  * @param  {string} 'mongodb'
  */
const mongo = require('mongodb').MongoClient;
/**
 * Require Socket.io to use  web sockets for the chat clients.
 * 
 * @const  string    client - socket listening clients
 * @param  {string} 'socket.io'
 * @param  {number} .listen(4001)
 */
const client = require('socket.io').listen(4001).sockets;
/**
 * Connect to MongoDB from localhost to database- chatter.
 */
mongo.connect('mongodb://127.0.0.1/chatter', function(err, db){
/**
 * If error in database connection - show error
 * 
 * @throws  {DatabaseError}
 */
    if(err){
        throw err;
            }
/**
 * If successfully connected, log connection.
 */
    console.log('MongoDB connected...');
    /**
     * Connect to Socket Client.
     * 
     * @param  {string} 'connection'
     * @param  {string} function(socket)
     */
    client.on('connection', function(socket){
        /**
         * Create or Use Collections
         *
         * @param  {string} 'chats'
         * @param  {string} 'users'
         */
        let chat = db.collection('chats');
        let user = db.collection('users');

        /**
         * Socket when recieving "add-user" call.
         * 
         * @param  {string} "add-user"
         * @param  {string[]} function(data)
         */
        socket.on("add-user", function(data){
            /**
             * Socket joins to rooms.
             *
             * @param  {room} data.username
             * @param  {room} "__public__"
             */
            socket.join(data.username);
            socket.join("__public__");
            /**
             * @var username is incoming data's username
             */
            let username = data.username;
            /**
             * Insert into collections -users
             * 
             * @param  {string} -username
             * @param  {timestamp} -joined_at timestamp
             */
            user.insert({username: username,joined_at: Date.now()}, function(){
                /**
                 * Fetch unique usernames from users collection
                 * 
                 * @param   {string}    "username"
                 * @returns  {srting[]}      userlist
                 */
            user.distinct("username", function(err, userlist){
                if(err){
                    throw err;}
                /**
                 * Send the user list to clients.
                 * 
                 * @param  {@var} 'users'
                 * @param  {string[]} userlist
                 */
                socket.emit('users',userlist);
                })
            });

            /**
             * Fetch chat history of both public and private from DB.
             * 
             * Descending Sort,Limit to 10, change to array format for emit
             * @param  {string} username
             * @param  {string} towhom
             * @param  {string} towhom
             */
            
            chat.find({$or:[{username:data.username},{towhom:data.username},{towhom:"__public__"}]}).limit(10).sort({_id:-1}).toArray(function(err, res){
                if(err){
                    throw err;
                        }      
                /**
                 * Send chat history to connected sockets.
                 * 
                 * @param  {string}       'history'
                 * @param  {string[]}    'result'
                 */
                socket.emit('history', res);
                });
             });
        
        /**
         * Listen for send-message call from sockets.
         * 
         * @param  {string} "send-message"
         * @param  {string[]} (incoming data)
         */
        socket.on("send-message", function(data){
            /**
             * Send the incoming message to appropriate room
             * 
             * @param   if private  - to intended user
             * @param   if public   -  to all users
             * @returns {emit}      - new message with data
             */
            data.username = data.username || "__public__";
            client.to(data.username).emit("new-message", data);
            /**
             * @var towhom
             * @var username
             * @var message
             */
            let towhom = data.username;
            let username = data.from;
            let message = data.content;     
            /**
             * Insert all chat activities to collection -chats
             * @param  {string}    username       username
             * @param  {string}     message        content
             * @param  {string}      towhom         recipient
             * @param  {timestamp}   sent_at        timestamp
             */
            chat.insert({username: username, message: message, towhom:towhom, sent_at: Date.now()}, function(){
                
                /**
                 * Emit chat activity to client.
                 * @param  {string[]} 'output'
                 */
                client.emit('output', [data]);
            });
        });
    });
});


